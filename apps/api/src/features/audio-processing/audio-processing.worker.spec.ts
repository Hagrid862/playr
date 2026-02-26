import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Logger, NotFoundException } from '@nestjs/common';
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
import * as fs from 'fs/promises';
import * as mm from 'music-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioTranscodeService } from './audio-transcode.service';
import { AudioProcessingJobData, AudioProcessingWorker } from './audio-processing.worker';
import { WaveformService } from './waveform.service';

vi.mock('fs/promises');
vi.mock('music-metadata');

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

const createMockJob = (
  data: AudioProcessingJobData,
  id: string = 'job-1',
): Job<AudioProcessingJobData> => createMock<Job<AudioProcessingJobData>>({ data, id });

describe('AudioProcessingWorker', () => {
  let worker: AudioProcessingWorker;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let trackRepository: DeepMocked<TrackRepository>;
  let storageService: DeepMocked<StorageService>;
  let transcodeService: DeepMocked<AudioTranscodeService>;
  let waveformService: DeepMocked<WaveformService>;

  beforeEach(async () => {
    audioFileRepository = createMock<AudioFileRepository>();
    trackRepository = createMock<TrackRepository>();
    storageService = createMock<StorageService>();
    transcodeService = createMock<AudioTranscodeService>();
    waveformService = createMock<WaveformService>();

    transcodeService.getMimeType.mockImplementation((format: AudioFormat) => {
      const mime: Record<string, string> = {
        [AudioFormat.mp3]: 'audio/mpeg',
        [AudioFormat.opus]: 'audio/opus',
        [AudioFormat.flac]: 'audio/flac',
        [AudioFormat.wav]: 'audio/wav',
        [AudioFormat.aac]: 'audio/aac',
      };
      return mime[format] ?? 'application/octet-stream';
    });
    transcodeService.transcode.mockResolvedValue();
    waveformService.generateWaveform.mockResolvedValue(Array.from({ length: 1024 }, () => 0));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioProcessingWorker,
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: StorageService, useValue: storageService },
        { provide: AudioTranscodeService, useValue: transcodeService },
        { provide: WaveformService, useValue: waveformService },
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

    it('should throw when audio file not found', async () => {
      audioFileRepository.findOne.mockResolvedValue(null);

      await expect(worker.process(mockJob)).rejects.toThrow(NotFoundException);
      await expect(worker.process(mockJob)).rejects.toThrow('Audio file af-123 not found');
      expect(audioFileRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when job data is invalid', async () => {
      const invalidJob = createMockJob({
        audioFileId: '',
        trackId: 'tr-123',
        userId: 'user-123',
      });

      await expect(worker.process(invalidJob)).rejects.toThrow('audioFileId is required');
      expect(audioFileRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw when trackId is missing', async () => {
      const invalidJob = createMockJob({
        audioFileId: 'af-123',
        trackId: '',
        userId: 'user-123',
      });

      await expect(worker.process(invalidJob)).rejects.toThrow('trackId is required');
    });

    it('should throw when userId is missing', async () => {
      const invalidJob = createMockJob({
        audioFileId: 'af-123',
        trackId: 'tr-123',
        userId: '',
      });

      await expect(worker.process(invalidJob)).rejects.toThrow('userId is required');
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
      expect(waveformService.generateWaveform).toHaveBeenCalledWith(expect.any(String), 1024);
      expect(audioFileRepository.update).toHaveBeenCalledWith('af-123', expect.any(Object));
      expect(trackRepository.update).toHaveBeenCalledWith('tr-123', {
        duration: 120,
      });
      expect(audioFileRepository.create).toHaveBeenCalledTimes(5);
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
      expect(audioFileRepository.create).toHaveBeenCalled();
    });

    it('should process WAV file and create original FLAC with undefined bitrate', async () => {
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
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);

      const createCalls = audioFileRepository.create.mock.calls;
      const originalFlacCall = createCalls.find(
        (call) => call[0].quality === 'original' && call[0].format === AudioFormat.flac,
      );
      expect(originalFlacCall).toBeDefined();
      expect(originalFlacCall![0].bitrate).toBeUndefined();
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

      await expect(worker.process(mockJob)).rejects.toThrow(NotFoundException);
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

      await expect(worker.process(mockJob)).rejects.toThrow('Storage failure');
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
        format: { duration: 120 },
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
        format: { duration: 120 },
      } as mm.IAudioMetadata);
      const trackWithAccess: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 0 }),
        access: [{ userId: 'user-123', role: 'owner' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithAccess);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);
      expect(audioFileRepository.create).toHaveBeenCalledTimes(4);
    });

    it('should log error if transcode fails for one quality and continue', async () => {
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
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      transcodeService.transcode
        .mockRejectedValueOnce(new Error('Transcode failed'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(audioFileRepository.create).toHaveBeenCalled();
      expect(transcodeService.transcode).toHaveBeenCalled();
    });

    it('should use temp dir prefix with job id', async () => {
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

      const jobWithId = createMockJob(
        {
          audioFileId: 'af-123',
          trackId: 'tr-123',
          userId: 'user-123',
        },
        'my-job-id',
      );

      await worker.process(jobWithId);

      expect(fs.mkdtemp).toHaveBeenCalledWith(expect.stringContaining('playr-my-job-id-'));
    });

    it('should fallback to unknown job id when job id is missing', async () => {
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

      const jobWithoutId = createMock<Job<AudioProcessingJobData>>({
        data: { audioFileId: 'af-123', trackId: 'tr-123', userId: 'user-123' },
        id: undefined,
      });

      await worker.process(jobWithoutId);

      expect(fs.mkdtemp).toHaveBeenCalledWith(expect.stringContaining('playr-unknown-'));
    });

    it('should skip track update if rounded duration matches existing duration', async () => {
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
          duration: 120.4,
          bitrate: 320000,
          sampleRate: 44100,
          numberOfChannels: 2,
        },
      } as mm.IAudioMetadata);
      const trackWithSameDuration: Track & { access: { userId: string; role: string }[] } = {
        ...createTrackFixture({ id: 'tr-123', duration: 120 }),
        access: [{ userId: 'user-123', role: 'owner' }],
      };
      trackRepository.findOne.mockResolvedValue(trackWithSameDuration);
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });

      await worker.process(mockJob);

      expect(trackRepository.update).not.toHaveBeenCalled();
    });

    it('should log warning if temp dir cleanup fails', async () => {
      audioFileRepository.findOne.mockResolvedValue(
        createAudioFileFixture({
          id: 'af-123',
          format: AudioFormat.mp3,
          key: 'path/to/original.mp3',
        }),
      );
      storageService.getFile.mockResolvedValue(Buffer.from('input'));
      trackRepository.findOne.mockResolvedValue(null);

      const cleanupError = new Error('Cleanup failed');
      vi.mocked(fs.rm).mockRejectedValue(cleanupError);
      const loggerSpy = vi.spyOn(Logger.prototype, 'warn');

      await expect(worker.process(mockJob)).rejects.toThrow(NotFoundException);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup temp dir'),
        cleanupError,
      );
      loggerSpy.mockRestore();
    });
  });
});
