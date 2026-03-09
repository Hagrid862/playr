import { Injectable } from '@nestjs/common';
import { AudioFormat } from '@repo/db';
import ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class AudioTranscodeService {
  async transcode(
    inputPath: string,
    outputPath: string,
    format: AudioFormat,
    bitrate: number | null,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

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
        .save(outputPath);
    });
  }

  getMimeType(format: AudioFormat): string {
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
