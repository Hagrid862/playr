import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import ffmpeg from 'fluent-ffmpeg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaveformService } from './waveform.service';

vi.mock('fluent-ffmpeg');

describe('WaveformService', () => {
  let service: WaveformService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WaveformService],
    }).compile();

    service = module.get<WaveformService>(WaveformService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWaveformBuffer', () => {
    it('should return zeroed array when samplesPerPoint is 0', () => {
      const buffer = Buffer.alloc(0);
      const result = WaveformService.processWaveformBuffer(buffer, 8, 2);
      expect(result).toHaveLength(8);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    it('should return zeroed array when buffer too short', () => {
      const buffer = Buffer.alloc(4);
      const result = WaveformService.processWaveformBuffer(buffer, 1024, 2);
      expect(result).toHaveLength(1024);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    it('should compute peaks from s16le buffer', () => {
      const buffer = Buffer.alloc(64);
      buffer.writeInt16LE(1000, 0);
      buffer.writeInt16LE(-8000, 8);
      buffer.writeInt16LE(16000, 16);

      const result = WaveformService.processWaveformBuffer(buffer, 8, 2);

      expect(result).toHaveLength(8);
      expect(result.some((v) => v > 0)).toBe(true);
    });

    it('should handle buffer length causing early break in inner loop', () => {
      const buffer = Buffer.alloc(33);
      buffer.writeInt16LE(1000, 0);

      const result = WaveformService.processWaveformBuffer(buffer, 8, 2);

      expect(result).toHaveLength(8);
    });
  });

  describe('generateWaveform', () => {
    it('should generate zeroed waveform when audio is too short', async () => {
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event: string, cb: (chunk?: Buffer) => void) => {
            if (event === 'data') cb(Buffer.alloc(0));
            else if (event === 'end') cb();
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      const result = await service.generateWaveform('/tmp/input.wav', 8);

      expect(result).toHaveLength(8);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    it('should generate waveform peaks when audio has enough samples', async () => {
      const sampleBuf = Buffer.alloc(64);
      sampleBuf.writeInt16LE(1000, 0);
      sampleBuf.writeInt16LE(-8000, 8);
      sampleBuf.writeInt16LE(16000, 16);

      const chain: Partial<ffmpeg.FfmpegCommand> = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event: string, cb: (chunk?: Buffer) => void) => {
            if (event === 'data') cb(sampleBuf);
            else if (event === 'end') cb();
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      const result = await service.generateWaveform('/tmp/input.wav', 8);

      expect(result).toHaveLength(8);
      expect(result.some((v) => v > 0)).toBe(true);
    });

    it('should reject when stream end callback throws', async () => {
      const readSpy = vi.spyOn(Buffer.prototype, 'readInt16LE').mockImplementation(function (
        this: Buffer,
        ...args: unknown[]
      ) {
        const offset = args[0] as number;
        if (offset === 0) throw new Error('buffer read error');
        return 0;
      });

      const chain: Partial<ffmpeg.FfmpegCommand> = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event: string, cb: (chunk?: Buffer) => void) => {
            if (event === 'data') cb(Buffer.alloc(16));
            else if (event === 'end') cb();
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await expect(service.generateWaveform('/tmp/input.wav', 4)).rejects.toThrow(
        'buffer read error',
      );
      readSpy.mockRestore();
    });

    it('should log and reject when ffmpeg emits error', async () => {
      const loggerSpy = vi.spyOn(Logger.prototype, 'error');
      const waveformError = new Error('waveform failed');

      const chain: Partial<ffmpeg.FfmpegCommand> = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: (err: Error) => void,
        ) {
          if (event === 'error') cb(waveformError);
          return this as ffmpeg.FfmpegCommand;
        }),
        pipe: vi.fn().mockReturnValue({ on: vi.fn() }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await expect(service.generateWaveform('/tmp/input.wav', 8)).rejects.toThrow(waveformError);
      expect(loggerSpy).toHaveBeenCalledWith('FFmpeg waveform generation error:', waveformError);
      loggerSpy.mockRestore();
    });
  });
});
