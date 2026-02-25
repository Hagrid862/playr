import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AudioFormat, ProcessingStatus } from '@repo/db';
import { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { AudioProcessingWorker } from './audio-processing.worker';
import * as fs from 'fs/promises';
import * as mm from 'music-metadata';
import ffmpeg from 'fluent-ffmpeg';

vi.mock('fs/promises');
vi.mock('music-metadata');
vi.mock('fluent-ffmpeg');

describe('AudioProcessingWorker', () => {
  let worker: AudioProcessingWorker;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let trackRepository: DeepMocked<TrackRepository>;
  let storageService: DeepMocked<StorageService>;

  beforeEach(async () => {
    audioFileRepository = createMock<AudioFileRepository>();
    trackRepository = createMock<TrackRepository>();
    storageService = createMock<StorageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioProcessingWorker,
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    worker = module.get<AudioProcessingWorker>(AudioProcessingWorker);

    vi.mocked(fs.mkdtemp).mockResolvedValue('/tmp/playr-test');
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('output'));
    vi.mocked(fs.writeFile).mockResolvedValue();
    vi.mocked(fs.rm).mockResolvedValue();

    vi.mocked(mm.parseFile).mockResolvedValue({
      format: {
        duration: 120,
        bitrate: 320000,
        sampleRate: 44100,
        numberOfChannels: 2,
      },
    } as any);

    // Mock ffmpeg correctly
    const mockFfmpegChain = {
      toFormat: vi.fn().mockReturnThis(),
      audioCodec: vi.fn().mockReturnThis(),
      audioBitrate: vi.fn().mockReturnThis(),
      noVideo: vi.fn().mockReturnThis(),
      audioChannels: vi.fn().mockReturnThis(),
      audioFrequency: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation(function (this: any, event, callback) {
        if (event === 'end') {
          setTimeout(callback, 0); // Simulate success
        }
        return this;
      }),
      save: vi.fn(),
      pipe: vi.fn().mockReturnValue({
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            callback(Buffer.alloc(1024));
          } else if (event === 'end') {
            setTimeout(callback, 0);
          }
        }),
      }),
    };

    vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('process', () => {
    const mockJob = {
      data: {
        audioFileId: 'af-123',
        trackId: 'tr-123',
        userId: 'user-123',
      },
    } as Job;

    it('should return early if audio file not found', async () => {
      audioFileRepository.findOne.mockResolvedValue(null);
      await worker.process(mockJob);
      expect(audioFileRepository.update).not.toHaveBeenCalled();
    });

    it('should process audio file successfully for non-lossless', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.mp3,
        key: 'path/to/original.mp3',
      } as any);

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      trackRepository.findOne.mockResolvedValue({
        id: 'tr-123',
        access: [{ userId: 'user-123', role: 'owner' }],
        duration: null,
      } as any);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);

      expect(fs.mkdtemp).toHaveBeenCalled();
      expect(storageService.getFile).toHaveBeenCalled();
      expect(mm.parseFile).toHaveBeenCalled();
      expect(audioFileRepository.update).toHaveBeenCalledWith('af-123', expect.any(Object));
      expect(trackRepository.update).toHaveBeenCalledWith('tr-123', { duration: 120 });
      expect(audioFileRepository.create).toHaveBeenCalledTimes(5); // 5 transcoding qualities

      // Cleanup
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should process audio file successfully for lossless', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.flac,
        key: 'path/to/original.flac',
      } as any);

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      trackRepository.findOne.mockResolvedValue({
        id: 'tr-123',
        access: [{ userId: 'user-123', role: 'owner' }],
        duration: 120, // same duration, should not update track
      } as any);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);

      expect(trackRepository.update).not.toHaveBeenCalled();
      // 5 qualities + 1 lossless replica minus the original skip -> normally generates flac, mp3 low/std/high, opus std/high
      // Actually because original is Flac/lossless, it adds { quality: 'original', format: flac } to qualities array...
      expect(audioFileRepository.create).toHaveBeenCalled();
    });

    it('should handle track not found exception', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.mp3,
        key: 'path/to/original.mp3',
      } as any);
      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      trackRepository.findOne.mockResolvedValue(null);

      await worker.process(mockJob);
      expect(audioFileRepository.update).toHaveBeenCalledWith('af-123', {
        status: ProcessingStatus.failed,
      });
    });

    it('should catch global errors and mark as failed', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.mp3,
        key: 'path/to/original.mp3',
      } as any);
      storageService.getFile.mockRejectedValue(new Error('Storage failure'));

      await worker.process(mockJob);
      expect(audioFileRepository.update).toHaveBeenCalledWith('af-123', {
        status: ProcessingStatus.failed,
      });
    });

    it('should process audio file and not update duration if missing from metadata', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.mp3,
        key: 'path/to/original.mp3',
      } as any);

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      vi.mocked(mm.parseFile).mockResolvedValue({
        format: {
          duration: undefined,
          bitrate: 320000,
          sampleRate: 44100,
          numberOfChannels: 2,
        },
      } as any);

      await worker.process(mockJob);
      expect(trackRepository.findOne).not.toHaveBeenCalled();
      expect(trackRepository.update).not.toHaveBeenCalled();
    });

    it('should process audio file and not update track if access role is invalid', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.mp3,
        key: 'path/to/original.mp3',
      } as any);

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      vi.mocked(mm.parseFile).mockResolvedValue({
        format: {
          duration: 120,
        },
      } as any);
      trackRepository.findOne.mockResolvedValue({
        id: 'tr-123',
        access: [{ userId: 'user-123', role: 'viewer' }],
        duration: null,
      } as any);

      await worker.process(mockJob);
      expect(trackRepository.update).not.toHaveBeenCalled();
    });

    it('should skip transcoding if quality and format match', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.mp3,
        quality: 'low',
        key: 'path/to/original.mp3',
      } as any);

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      vi.mocked(mm.parseFile).mockResolvedValue({
        format: {
          duration: 120,
        },
      } as any);
      trackRepository.findOne.mockResolvedValue({
        id: 'tr-123',
        access: [{ userId: 'user-123', role: 'owner' }],
        duration: null,
      } as any);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);
      // It tries low, standard (opus), standard (mp3), high (opus), high (mp3)
      // Since original is low mp3, it will skip that one, resulting in 4 creates instead of 5
      expect(audioFileRepository.create).toHaveBeenCalledTimes(4);
    });

    it('should log error if transcode fails and continue', async () => {
      audioFileRepository.findOne.mockResolvedValue({
        id: 'af-123',
        format: AudioFormat.wav,
        key: 'path/to/original.wav',
      } as any);

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      trackRepository.findOne.mockResolvedValue({
        id: 'tr-123',
        access: [{ userId: 'user-123', role: 'owner' }],
        duration: null,
      } as any);

      const transcodeSpy = vi
        .spyOn(worker as any, 'transcode')
        .mockRejectedValue(new Error('transcode err'));
      const loggerSpy = vi.spyOn((worker as any).logger, 'error');

      await worker.process(mockJob);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to transcode to'),
        expect.any(Error),
      );
      transcodeSpy.mockRestore();
      loggerSpy.mockRestore();
    });
  });

  describe('private methods', () => {
    it('getMimeType should return correct mime types', () => {
      expect(worker['getMimeType'](AudioFormat.aac)).toBe('audio/aac');
      expect(worker['getMimeType'](AudioFormat.wav)).toBe('audio/wav');
      expect(worker['getMimeType']('unknown' as AudioFormat)).toBe('application/octet-stream');
    });

    it('transcode should reject on error', async () => {
      const mockFfmpegChain = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (this: any, event, callback) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('transcode error')), 0);
          }
          return this;
        }),
        save: vi.fn(),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      await expect(worker['transcode']('input', 'output', AudioFormat.mp3, 128)).rejects.toThrow(
        'transcode error',
      );
    });

    it('transcode should omit command.audioBitrate if bitrate is null', async () => {
      const audioBitrateSpy = vi.fn().mockReturnThis();
      const mockFfmpegChain = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: audioBitrateSpy,
        on: vi.fn().mockImplementation(function (this: any, event, callback) {
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return this;
        }),
        save: vi.fn(),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      await worker['transcode']('input', 'output', AudioFormat.mp3, null);
      await worker['transcode']('input', 'output', AudioFormat.opus, null);
      await worker['transcode']('input', 'output', AudioFormat.flac, null);
      expect(audioBitrateSpy).not.toHaveBeenCalled();
    });

    it('transcode should fallthrough formats if unsupported like wav', async () => {
      const audioBitrateSpy = vi.fn().mockReturnThis();
      const mockFfmpegChain = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: audioBitrateSpy,
        on: vi.fn().mockImplementation(function (this: any, event, callback) {
          if (event === 'end') {
            setTimeout(callback, 0);
          }
          return this;
        }),
        save: vi.fn(),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      await worker['transcode']('input', 'output', AudioFormat.wav, null);
      expect(mockFfmpegChain.save).toHaveBeenCalledWith('output');
    });

    it('generateWaveform should reject on error', async () => {
      const mockFfmpegChain = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (this: any, event, callback) {
          if (event === 'error') {
            setTimeout(() => callback(new Error('waveform error')), 0);
          }
          return this;
        }),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn(),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      await expect(worker['generateWaveform']('input', 10)).rejects.toThrow('waveform error');
    });

    it('generateWaveform should resolve with 0s if samplesPerPoint is 0', async () => {
      const mockFfmpegChain = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback(Buffer.alloc(2)); // 2 bytes = 1 sample
            } else if (event === 'end') {
              setTimeout(callback, 0);
            }
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      const result = await worker['generateWaveform']('input', 100);
      expect(result).toHaveLength(100);
      expect(result.every((v) => v === 0)).toBe(true);
    });

    it('generateWaveform should resolve with calculated peaks and break early if bounds exceeded', async () => {
      const mockFfmpegChain = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              const buf = Buffer.alloc(4); // Only 4 bytes (2 samples)
              buf.writeInt16LE(16384, 0); // ~0.5
              buf.writeInt16LE(32767, 2); // ~1.0

              callback(buf);
            } else if (event === 'end') {
              setTimeout(callback, 0);
            }
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      // Wanting 1 point out of 2 samples -> checks bounds break internally
      const result = await worker['generateWaveform']('input', 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeCloseTo(1.0, 1);
    });

    it('generateWaveform should catch error during processing', async () => {
      const mockFfmpegChain = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback(Buffer.alloc(16));
            }
            if (event === 'end') {
              setTimeout(callback, 0);
            }
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      const fakeBuffer = {
        length: 16,
        readInt16LE: () => {
          throw new Error('read error');
        },
      };
      const concatSpy = vi.spyOn(Buffer, 'concat').mockReturnValue(fakeBuffer as any);

      await expect(worker['generateWaveform']('input', 2)).rejects.toThrow('read error');
      concatSpy.mockRestore();
    });

    it('generateWaveform should break early if bounds exceeded', async () => {
      const mockFfmpegChain = {
        noVideo: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback(Buffer.alloc(16));
            }
            if (event === 'end') {
              setTimeout(callback, 0);
            }
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as any);

      let getLengthCalls = 0;
      const fakeBuffer = {
        get length() {
          getLengthCalls++;
          if (getLengthCalls === 1) return 16;
          return 0; // Trigger break condition on subsequent reads
        },
        readInt16LE: () => 0,
      };
      const concatSpy = vi.spyOn(Buffer, 'concat').mockReturnValue(fakeBuffer as any);

      const result = await worker['generateWaveform']('input', 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      concatSpy.mockRestore();
    });
  });
});
