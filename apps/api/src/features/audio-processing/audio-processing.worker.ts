import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { ZodTrack } from '@repo/contracts';
import { AudioFormat, AudioQuality, FileBucket, ProcessingStatus } from '@repo/db';
import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs/promises';
import * as mm from 'music-metadata';
import * as os from 'os';
import * as path from 'path';

export interface AudioProcessingJobData {
  audioFileId: string;
  trackId: string;
  userId: string;
}

@Processor('audio-processing')
export class AudioProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(AudioProcessingWorker.name);

  constructor(
    private readonly audioFileRepository: AudioFileRepository,
    private readonly trackRepository: TrackRepository,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<AudioProcessingJobData>): Promise<void> {
    const { audioFileId, trackId, userId } = job.data;
    this.logger.log(`Processing audio file ${audioFileId} for track ${trackId}`);

    const originalFile = await this.audioFileRepository.findOne({ id: audioFileId });
    if (!originalFile) {
      this.logger.error(`Audio file ${audioFileId} not found`);
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playr-'));
    const inputPath = path.join(tempDir, `input_${originalFile.id}`);

    try {
      // 1. Download original file
      const originalBuffer = await this.storageService.getFile(
        FileBucket.private,
        originalFile.key,
      );
      await fs.writeFile(inputPath, originalBuffer);

      // 2. Extract Metadata
      const metadata = await mm.parseFile(inputPath);
      const { duration, bitrate, sampleRate, numberOfChannels } = metadata.format;

      // Update original file with metadata
      await this.audioFileRepository.update(audioFileId, {
        duration,
        bitrate,
        sampleRate,
        channels: numberOfChannels,
        status: ProcessingStatus.complete,
      });

      // Update track duration if not already set or different
      if (duration) {
        const track = await this.trackRepository.findOne({ id: trackId }, true);

        if (!track) {
          throw new NotFoundException('Track not found');
        }

        const trackWithRelations = track as ZodTrack & {
          access?: { userId: string; role: string }[];
        };

        // Basic permission check - only owners/editors can upload audio
        const hasAccess = trackWithRelations.access?.some(
          (a: { userId: string; role: string }) =>
            a.userId === userId && (a.role === 'owner' || a.role === 'editor'),
        );

        // Only update duration if it's not already set or if the new duration is different
        // and the user has access to modify the track.
        if (hasAccess && (!track.duration || Math.round(duration) !== track.duration)) {
          await this.trackRepository.update(trackId, { duration: Math.round(duration) });
        }
      }

      // 3. Generate Waveform (Master 1024 points)
      const waveform = await this.generateWaveform(inputPath, 1024);
      await this.audioFileRepository.update(audioFileId, {
        waveformJson: JSON.stringify(waveform),
      });

      // 4. Determine transcoding requirement
      const isLossless = ['wav', 'flac'].includes(originalFile.format.toLowerCase());

      // Define transcoding qualities
      const qualities: { quality: AudioQuality; format: AudioFormat; bitrate: number | null }[] = [
        { quality: 'low', format: AudioFormat.mp3, bitrate: 64 },
        { quality: 'standard', format: AudioFormat.opus, bitrate: 128 },
        { quality: 'standard', format: AudioFormat.mp3, bitrate: 128 },
        { quality: 'high', format: AudioFormat.opus, bitrate: 256 },
        { quality: 'high', format: AudioFormat.mp3, bitrate: 320 },
      ];

      if (isLossless) {
        qualities.push({ quality: 'original', format: AudioFormat.flac, bitrate: null });
      }

      // 5. Transcode and Upload
      for (const q of qualities) {
        // Skip if original is already in this format/quality (simple version)
        if (originalFile.format === q.format && originalFile.quality === q.quality) continue;

        try {
          const outputPath = path.join(tempDir, `output_${q.quality}_${q.format}.${q.format}`);
          await this.transcode(inputPath, outputPath, q.format, q.bitrate);

          const outputBuffer = await fs.readFile(outputPath);
          const key = `tracks/${trackId}/processed/${q.quality}/${Date.now()}.${q.format}`;

          const { url } = await this.storageService.uploadFile(
            outputBuffer,
            FileBucket.private,
            key,
            { contentType: this.getMimeType(q.format) },
          );

          await this.audioFileRepository.create({
            track: { connect: { id: trackId } },
            bucket: FileBucket.private,
            key,
            url,
            mimeType: this.getMimeType(q.format),
            size: outputBuffer.length,
            format: q.format,
            isOriginal: false,
            quality: q.quality,
            status: ProcessingStatus.complete,
            duration: duration,
            bitrate: q.bitrate ? q.bitrate * 1000 : undefined,
            sampleRate,
            channels: numberOfChannels,
          });
        } catch (error) {
          this.logger.error(`Failed to transcode to ${q.quality} ${q.format}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing audio file ${audioFileId}:`, error);
      await this.audioFileRepository.update(audioFileId, { status: ProcessingStatus.failed });
    } finally {
      // Cleanup temp files
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async transcode(
    input: string,
    output: string,
    format: AudioFormat,
    bitrate: number | null,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(input);

      if (format === AudioFormat.mp3) {
        command = command.toFormat('mp3').audioCodec('libmp3lame');
        if (bitrate) command = command.audioBitrate(bitrate);
      } else if (format === AudioFormat.opus) {
        command = command.toFormat('opus').audioCodec('libopus');
        if (bitrate) command = command.audioBitrate(bitrate);
      } else if (format === AudioFormat.flac) {
        command = command.toFormat('flac').audioCodec('flac');
      }

      command
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(output);
    });
  }

  private async generateWaveform(input: string, points: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const peaks: number[] = [];
      const sampleRate = 44100;
      const bitDepth = 16;
      const bytesPerSample = bitDepth / 8;

      const command = ffmpeg(input)
        .noVideo()
        .toFormat('s16le')
        .audioChannels(1)
        .audioFrequency(sampleRate)
        .on('error', (err: Error) => {
          this.logger.error('FFmpeg waveform generation error:', err);
          reject(err);
        });

      const stream = command.pipe();
      let buffer = Buffer.alloc(0);

      stream.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
      });

      stream.on('end', () => {
        try {
          const totalSamples = buffer.length / bytesPerSample;
          const samplesPerPoint = Math.floor(totalSamples / points);

          if (samplesPerPoint === 0) {
            resolve(Array.from({ length: points }, () => 0));
            return;
          }

          for (let i = 0; i < points; i++) {
            let max = 0;
            for (let j = 0; j < samplesPerPoint; j++) {
              const index = (i * samplesPerPoint + j) * bytesPerSample;
              if (index + bytesPerSample > buffer.length) break;
              const sample = buffer.readInt16LE(index);
              const absSample = Math.abs(sample) / 32768; // Normalize to 0-1
              if (absSample > max) max = absSample;
            }
            peaks.push(Number(max.toFixed(4)));
          }
          resolve(peaks);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private getMimeType(format: AudioFormat): string {
    switch (format) {
      case AudioFormat.mp3:
        return 'audio/mpeg';
      case AudioFormat.opus:
        return 'audio/opus';
      case AudioFormat.flac:
        return 'audio/flac';
      case AudioFormat.wav:
        return 'audio/wav';
      case AudioFormat.aac:
        return 'audio/aac';
      default:
        return 'application/octet-stream';
    }
  }
}
