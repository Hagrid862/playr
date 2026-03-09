import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AudioFile,
  AudioFormat,
  AudioQuality,
  FileBucket,
  ProcessingStatus,
  Track,
} from '@repo/db';
import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs/promises';
import * as mm from 'music-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioProcessingJobData, AudioProcessingWorker } from './audio-processing.worker';

vi.mock('fs/promises');
vi.mock('music-metadata');
vi.mock('fluent-ffmpeg');

const createAudioFileFixture = (overrides: Partial<AudioFile> = {}): AudioFile => ({
  id: 'af-123',
  bucket: FileBucket.private,
  key: 'path/to/original.mp3',
  url: null,
  mimeType: 'audio/mpeg',
  size: 1234,
  format: AudioFormat.mp3,
  duration: null,
  bitrate: null,
  sampleRate: null,
  channels: null,
  isOriginal: true,
  waveformJson: null,
  trackId: 'tr-123',
  quality: AudioQuality.original,
  status: ProcessingStatus.pending,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createTrackFixture = (overrides: Partial<Track> = {}): Track => ({
  id: 'tr-123',
  title: 'Test Track',
  trackNumber: 1,
  diskNumber: 1,
  duration: 0,
  listenedCount: 0,
  explicit: false,
  lyrics: null,
  visibility: 'private',
  albumId: 'album-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

const createMockJob = (data: AudioProcessingJobData): Job<AudioProcessingJobData> =>
  createMock<Job<AudioProcessingJobData>>({ data });

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
    } as mm.IAudioMetadata);

    // Mock ffmpeg correctly
    const mockFfmpegChain: Partial<ffmpeg.FfmpegCommand> = {
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

    vi.mocked(ffmpeg).mockReturnValue(mockFfmpegChain as ffmpeg.FfmpegCommand);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('process', () => {
    const mockJob = createMockJob({
      audioFileId: 'af-123',
      trackId: 'tr-123',
      userId: 'user-123',
    });

    it('should return early if audio file not found', async () => {
      audioFileRepository.findOne.mockResolvedValue(null);
      await worker.process(mockJob);
      expect(audioFileRepository.update).not.toHaveBeenCalled();
    });

    it('should process audio file successfully for non-lossless', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          key: 'path/to/original.mp3',
        }),
      );

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      const trackWithAccess: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 0 }),
        access: [{ userId: 'user-123', role: 'owner' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithAccess);
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
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.flac,
          key: 'path/to/original.flac',
        }),
      );

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      const trackWithAccess: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 120 }),
        access: [{ userId: 'user-123', role: 'owner' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithAccess);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);

      expect(trackRepository.update).not.toHaveBeenCalled();
      // 5 qualities + 1 lossless replica minus the original skip -> normally generates flac, mp3 low/std/high, opus std/high
      // Actually because original is Flac/lossless, it adds { quality: 'original', format: flac } to qualities array...
      expect(audioFileRepository.create).toHaveBeenCalled();
    });

    it('should handle track not found exception', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          key: 'path/to/original.mp3',
        }),
      );
      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      trackRepository.findOne.mockResolvedValue(null);

      await worker.process(mockJob);
      expect(audioFileRepository.update).toHaveBeenCalledWith('af-123', {
        status: ProcessingStatus.failed,
      });
    });

    it('should catch global errors and mark as failed', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          key: 'path/to/original.mp3',
        }),
      );
      storageService.getFile.mockRejectedValue(new Error('Storage failure'));

      await worker.process(mockJob);
      expect(audioFileRepository.update).toHaveBeenCalledWith('af-123', {
        status: ProcessingStatus.failed,
      });
    });

    it('should process audio file and not update duration if missing from metadata', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          key: 'path/to/original.mp3',
        }),
      );

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      vi.mocked(mm.parseFile).mockResolvedValue({
        format: {
          duration: undefined,
          bitrate: 320000,
          sampleRate: 44100,
          numberOfChannels: 2,
        },
      } as mm.IAudioMetadata);

      await worker.process(mockJob);
      expect(trackRepository.findOne).not.toHaveBeenCalled();
      expect(trackRepository.update).not.toHaveBeenCalled();
    });

    it('should process audio file and not update track if access role is invalid', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          key: 'path/to/original.mp3',
        }),
      );

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      vi.mocked(mm.parseFile).mockResolvedValue({
        format: {
          duration: 120,
        },
      } as mm.IAudioMetadata);
      const trackWithAccess: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 0 }),
        access: [{ userId: 'user-123', role: 'viewer' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithAccess);

      await worker.process(mockJob);
      expect(trackRepository.update).not.toHaveBeenCalled();
    });

    it('should skip transcoding if quality and format match', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          quality: AudioQuality.low,
          key: 'path/to/original.mp3',
        }),
      );

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      vi.mocked(mm.parseFile).mockResolvedValue({
        format: {
          duration: 120,
        },
      } as mm.IAudioMetadata);
      const trackWithAccess: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 0 }),
        access: [{ userId: 'user-123', role: 'owner' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithAccess);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);
      // It tries low, standard (opus), standard (mp3), high (opus), high (mp3)
      // Since original is low mp3, it will skip that one, resulting in 4 creates instead of 5
      expect(audioFileRepository.create).toHaveBeenCalledTimes(4);
    });

    it('should log error if transcode fails and continue', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.wav,
          key: 'path/to/original.wav',
        }),
      );

      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      const trackWithAccess: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 0 }),
        access: [{ userId: 'user-123', role: 'owner' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithAccess);

      const loggerSpy = vi.spyOn(Logger.prototype, 'error');

      // Override ffmpeg: must support generateWaveform (noVideo, pipe) and trigger error during transcode (save)
      let errorCallback: ((err: Error) => void) | null = null;
      const transcodeError = new Error('Transcode failed');
      const errorChain: Partial<ffmpeg.FfmpegCommand> = {
        toFormat: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        audioBitrate: vi.fn().mockReturnThis(),
        noVideo: vi.fn().mockReturnThis(),
        audioChannels: vi.fn().mockReturnThis(),
        audioFrequency: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: (err?: Error) => void,
        ) {
          if (event === 'error') {
            errorCallback = cb as (err: Error) => void;
          }
          return this as ffmpeg.FfmpegCommand;
        }),
        save: vi.fn().mockImplementation(() => {
          if (errorCallback) {
            setTimeout(() => errorCallback!(transcodeError), 0);
          }
        }),
        pipe: vi.fn().mockReturnValue({
          on: vi.fn().mockImplementation((event: string, callback: (chunk?: Buffer) => void) => {
            if (event === 'data') {
              callback(Buffer.alloc(1024));
            } else if (event === 'end') {
              setTimeout(callback, 0);
            }
          }),
        }),
      };
      vi.mocked(ffmpeg).mockReturnValue(errorChain as ffmpeg.FfmpegCommand);

      await worker.process(mockJob);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to transcode to'),
        expect.any(Error),
      );
      loggerSpy.mockRestore();
    });
  });
});
