import { Test, TestingModule } from '@nestjs/testing';
import { AudioFormat } from '@repo/db';
import ffmpeg from 'fluent-ffmpeg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioTranscodeService } from './audio-transcode.service';

vi.mock('fluent-ffmpeg');

describe('AudioTranscodeService', () => {
  let service: AudioTranscodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioTranscodeService],
    }).compile();

    service = module.get<AudioTranscodeService>(AudioTranscodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMimeType', () => {
    it('should map formats to correct mime types', () => {
      expect(service.getMimeType(AudioFormat.mp3)).toBe('audio/mpeg');
      expect(service.getMimeType(AudioFormat.opus)).toBe('audio/opus');
      expect(service.getMimeType(AudioFormat.flac)).toBe('audio/flac');
      expect(service.getMimeType(AudioFormat.wav)).toBe('audio/wav');
      expect(service.getMimeType(AudioFormat.aac)).toBe('audio/aac');
      expect(service.getMimeType('other' as AudioFormat)).toBe(
        'application/octet-stream',
      );
    });
  });

  describe('transcode', () => {
    it('should transcode mp3 with bitrate', async () => {
      const callbacks: Record<string, (() => void)[]> = {};
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          callbacks[event] = callbacks[event] ?? [];
          callbacks[event].push(cb);
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks['end']?.forEach((cb) => cb());
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await service.transcode('/tmp/in', '/tmp/out', AudioFormat.mp3, 128);

      expect(chain.toFormat).toHaveBeenCalledWith('mp3');
      expect(chain.audioCodec).toHaveBeenCalledWith('libmp3lame');
      expect(chain.audioBitrate).toHaveBeenCalledWith(128);
    });

    it('should transcode mp3 without bitrate', async () => {
      const callbacks: Record<string, (() => void)[]> = {};
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          callbacks[event] = callbacks[event] ?? [];
          callbacks[event].push(cb);
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks['end']?.forEach((cb) => cb());
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await service.transcode('/tmp/in', '/tmp/out', AudioFormat.mp3, null);

      expect(chain.toFormat).toHaveBeenCalledWith('mp3');
      expect(chain.audioCodec).toHaveBeenCalledWith('libmp3lame');
      expect(chain.audioBitrate).not.toHaveBeenCalled();
    });

    it('should transcode opus with bitrate', async () => {
      const callbacks: Record<string, (() => void)[]> = {};
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          callbacks[event] = callbacks[event] ?? [];
          callbacks[event].push(cb);
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks['end']?.forEach((cb) => cb());
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await service.transcode('/tmp/in', '/tmp/out', AudioFormat.opus, 128);

      expect(chain.toFormat).toHaveBeenCalledWith('opus');
      expect(chain.audioCodec).toHaveBeenCalledWith('libopus');
      expect(chain.audioBitrate).toHaveBeenCalledWith(128);
    });

    it('should transcode opus without bitrate', async () => {
      const callbacks: Record<string, (() => void)[]> = {};
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          callbacks[event] = callbacks[event] ?? [];
          callbacks[event].push(cb);
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks['end']?.forEach((cb) => cb());
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await service.transcode('/tmp/in', '/tmp/out', AudioFormat.opus, null);

      expect(chain.toFormat).toHaveBeenCalledWith('opus');
      expect(chain.audioCodec).toHaveBeenCalledWith('libopus');
      expect(chain.audioBitrate).not.toHaveBeenCalled();
    });

    it('should not set format when format is not mp3/opus/flac', async () => {
      const callbacks: Record<string, (() => void)[]> = {};
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          callbacks[event] = callbacks[event] ?? [];
          callbacks[event].push(cb);
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks['end']?.forEach((cb) => cb());
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await service.transcode(
        '/tmp/in',
        '/tmp/out',
        AudioFormat.wav,
        null,
      );

      expect(chain.toFormat).not.toHaveBeenCalled();
      expect(chain.audioCodec).not.toHaveBeenCalled();
      expect(chain.audioBitrate).not.toHaveBeenCalled();
    });

    it('should transcode flac without bitrate', async () => {
      const callbacks: Record<string, (() => void)[]> = {};
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          callbacks[event] = callbacks[event] ?? [];
          callbacks[event].push(cb);
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks['end']?.forEach((cb) => cb());
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await service.transcode('/tmp/in', '/tmp/out', AudioFormat.flac, null);

      expect(chain.toFormat).toHaveBeenCalledWith('flac');
      expect(chain.audioCodec).toHaveBeenCalledWith('flac');
      expect(chain.audioBitrate).not.toHaveBeenCalled();
    });

    it('should reject when ffmpeg emits error', async () => {
      const callbacks: { error?: (err: Error) => void } = {};
      const transcodeError = new Error('ffmpeg error');
      const chain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: (err: Error) => void,
        ) {
          if (event === 'error') callbacks.error = cb;
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          callbacks.error?.(transcodeError);
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(chain as ffmpeg.FfmpegCommand);

      await expect(
        service.transcode('/tmp/in', '/tmp/out', AudioFormat.mp3, 128),
      ).rejects.toThrow(transcodeError);
    });
  });
});
