import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { FileBucket, ProcessingStatus } from '@repo/db';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import * as mm from 'music-metadata';
import * as os from 'os';
import * as path from 'path';
import {
  LOSSLESS_FORMATS,
  LOSSLESS_QUALITY_PRESET,
  TEMP_DIR_PREFIX,
  TRANSCRIPTION_QUALITIES,
  WAVEFORM_POINTS,
} from './audio-processing.constants';
import { canUserUpdateTrackDuration } from './audio-processing.utils';
import { AudioTranscodeService } from './audio-transcode.service';
import { WaveformService } from './waveform.service';

export interface AudioProcessingJobData {
  audioFileId: string;
  trackId: string;
  userId: string;
}

function validateJobData(data: AudioProcessingJobData): void {
  if (!data.audioFileId?.trim()) {
    throw new Error('audioFileId is required');
  }
  if (!data.trackId?.trim()) {
    throw new Error('trackId is required');
  }
  if (!data.userId?.trim()) {
    throw new Error('userId is required');
  }
}

@Processor('audio-processing')
export class AudioProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(AudioProcessingWorker.name);

  constructor(
    private readonly audioFileRepository: AudioFileRepository,
    private readonly trackRepository: TrackRepository,
    private readonly storageService: StorageService,
    private readonly transcodeService: AudioTranscodeService,
    private readonly waveformService: WaveformService,
  ) {
    super();
  }

  async process(job: Job<AudioProcessingJobData>): Promise<void> {
    const startedAt = Date.now();
    const jobId = String(job.id ?? 'unknown');
    const { audioFileId, trackId, userId } = job.data;

    validateJobData(job.data);

    this.logger.log(`[${jobId}] Processing audio file ${audioFileId} for track ${trackId}`);

    const originalFile = await this.audioFileRepository.getById(audioFileId);
    if (!originalFile) {
      this.logger.error(`[${jobId}] Audio file ${audioFileId} not found`, {
        audioFileId,
        trackId,
        userId,
      });
      throw new NotFoundException(`Audio file ${audioFileId} not found`);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${TEMP_DIR_PREFIX}${jobId}-`));
    const inputPath = path.join(tempDir, `input_${originalFile.id}`);

    try {
      const originalBuffer = await this.storageService.getFile(
        FileBucket.private,
        originalFile.key,
      );
      await fs.writeFile(inputPath, originalBuffer);

      const metadata = await mm.parseFile(inputPath);
      const { duration, bitrate, sampleRate, numberOfChannels } = metadata.format;

      await this.audioFileRepository.update(audioFileId, {
        duration,
        bitrate,
        sampleRate,
        channels: numberOfChannels,
        status: ProcessingStatus.complete,
      });

      if (duration) {
        const track = await this.trackRepository.getById(trackId, { include: { access: true } });
        if (!track) {
          throw new NotFoundException('Track not found');
        }
        const hasAccess = canUserUpdateTrackDuration(
          track as { access?: { userId: string; role: string }[] },
          userId,
        );
        if (hasAccess && (!track.duration || Math.round(duration) !== track.duration)) {
          await this.trackRepository.update(trackId, {
            duration: Math.round(duration),
          });
        }
      }

      const waveform = await this.waveformService.generateWaveform(inputPath, WAVEFORM_POINTS);
      await this.audioFileRepository.update(audioFileId, {
        waveformJson: JSON.stringify(waveform),
      });

      const isLossless = LOSSLESS_FORMATS.includes(
        originalFile.format.toLowerCase() as (typeof LOSSLESS_FORMATS)[number],
      );
      const qualities = [...TRANSCRIPTION_QUALITIES];
      if (isLossless) {
        qualities.push(LOSSLESS_QUALITY_PRESET);
      }

      for (const q of qualities) {
        if (originalFile.format === q.format && originalFile.quality === q.quality) {
          continue;
        }
        try {
          const outputPath = path.join(tempDir, `output_${q.quality}_${q.format}.${q.format}`);
          await this.transcodeService.transcode(inputPath, outputPath, q.format, q.bitrate);
          const outputBuffer = await fs.readFile(outputPath);
          const key = `tracks/${trackId}/processed/${q.quality}/${Date.now()}.${q.format}`;
          const { url } = await this.storageService.uploadFile(
            outputBuffer,
            FileBucket.private,
            key,
            {
              contentType: this.transcodeService.getMimeType(q.format),
            },
          );
          await this.audioFileRepository.create({
            track: { connect: { id: trackId } },
            bucket: FileBucket.private,
            key,
            url,
            mimeType: this.transcodeService.getMimeType(q.format),
            size: outputBuffer.length,
            format: q.format,
            isOriginal: false,
            quality: q.quality,
            status: ProcessingStatus.complete,
            duration,
            bitrate: q.bitrate ? q.bitrate * 1000 : undefined,
            sampleRate,
            channels: numberOfChannels,
          });
        } catch (error) {
          this.logger.error(`[${jobId}] Failed to transcode to ${q.quality} ${q.format}`, {
            error,
            audioFileId,
            trackId,
            quality: q.quality,
            format: q.format,
          });
        }
      }

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `[${jobId}] Completed processing audio file ${audioFileId} in ${durationMs}ms`,
      );
    } catch (error) {
      this.logger.error(`[${jobId}] Error processing audio file ${audioFileId}`, {
        error,
        audioFileId,
        trackId,
        userId,
      });
      await this.audioFileRepository.update(audioFileId, {
        status: ProcessingStatus.failed,
      });
      throw error;
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.warn(`[${jobId}] Failed to cleanup temp dir ${tempDir}`, cleanupError);
      }
    }
  }
}
