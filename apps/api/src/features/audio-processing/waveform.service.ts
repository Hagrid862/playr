import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import {
  WAVEFORM_BIT_DEPTH,
  WAVEFORM_SAMPLE_RATE,
} from './audio-processing.constants';

@Injectable()
export class WaveformService {
  private readonly logger = new Logger(WaveformService.name);

  /**
   * Extract peak values from raw PCM buffer (s16le). Pure function for testability.
   */
  static processWaveformBuffer(
    buffer: Buffer,
    points: number,
    bytesPerSample: number,
  ): number[] {
    const totalSamples = buffer.length / bytesPerSample;
    const samplesPerPoint = Math.floor(totalSamples / points);

    if (samplesPerPoint === 0) {
      return Array.from({ length: points }, () => 0);
    }

    const peaks: number[] = [];
    for (let i = 0; i < points; i++) {
      let max = 0;
      for (let j = 0; j < samplesPerPoint; j++) {
        const index = (i * samplesPerPoint + j) * bytesPerSample;
        if (index + bytesPerSample > buffer.length) break;
        const sample = buffer.readInt16LE(index);
        const absSample = Math.abs(sample) / 32768;
        if (absSample > max) max = absSample;
      }
      peaks.push(Number(max.toFixed(4)));
    }
    return peaks;
  }

  async generateWaveform(inputPath: string, points: number): Promise<number[]> {
    const bytesPerSample = WAVEFORM_BIT_DEPTH / 8;

    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);

      const command = ffmpeg(inputPath)
        .noVideo()
        .toFormat('s16le')
        .audioChannels(1)
        .audioFrequency(WAVEFORM_SAMPLE_RATE)
        .on('error', (err: Error) => {
          this.logger.error('FFmpeg waveform generation error:', err);
          reject(err);
        });

      const stream = command.pipe();

      stream.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
      });

      stream.on('end', () => {
        try {
          resolve(
            WaveformService.processWaveformBuffer(
              buffer,
              points,
              bytesPerSample,
            ),
          );
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
