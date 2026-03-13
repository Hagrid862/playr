import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessRole, AudioFormat, FileBucket, ProcessingStatus } from '@repo/db';
import { Queue } from 'bullmq';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAudioFile, buildTrackWithAccess, createMockMulterFile } from '@repo/testing';
import { UploadTrackAudioCommand } from '../impl/upload-track-audio.command';
import { UploadTrackAudioHandler } from './upload-track-audio.handler';

describe('UploadTrackAudioHandler', () => {
  let handler: UploadTrackAudioHandler;
  let trackRepository: DeepMocked<TrackRepository>;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let storageService: DeepMocked<StorageService>;
  let processingQueue: DeepMocked<Queue>;

  const mockUserId = 'user-123';
  const mockTrackId = 'track-123';

  beforeEach(async () => {
    trackRepository = createMock<TrackRepository>();
    audioFileRepository = createMock<AudioFileRepository>();
    storageService = createMock<StorageService>();
    processingQueue = createMock<Queue>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadTrackAudioHandler,
        { provide: TrackRepository, useValue: trackRepository },
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: StorageService, useValue: storageService },
        { provide: getQueueToken('audio-processing'), useValue: processingQueue },
      ],
    }).compile();

    handler = module.get<UploadTrackAudioHandler>(UploadTrackAudioHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockFile = createMockMulterFile({
      buffer: Buffer.from('test audio content'),
      mimetype: 'audio/mpeg',
      originalname: 'test-song.mp3',
      size: 1024,
    });

    const mockCommand = new UploadTrackAudioCommand(mockTrackId, mockUserId, mockFile);

    it('should throw NotFoundException if track does not exist', async () => {
      trackRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(mockCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      trackRepository.findOne.mockResolvedValue(
        buildTrackWithAccess({ id: mockTrackId }, [
          { userId: 'other-user', role: AccessRole.owner },
        ]),
      );

      await expect(handler.execute(mockCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user role is viewer', async () => {
      trackRepository.findOne.mockResolvedValue(
        buildTrackWithAccess({ id: mockTrackId }, [
          { userId: mockUserId, role: AccessRole.viewer },
        ]),
      );

      await expect(handler.execute(mockCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should upload file, create audio file record, and dispatch job on success', async () => {
      trackRepository.findOne.mockResolvedValue(
        buildTrackWithAccess({ id: mockTrackId }, [{ userId: mockUserId, role: AccessRole.owner }]),
      );

      const mockUrl = 'https://s3.url/path';
      storageService.uploadFile.mockResolvedValue({ url: mockUrl, key: 'test-key' });

      audioFileRepository.create.mockResolvedValue(
        buildAudioFile({ id: 'audio-id-123', trackId: mockTrackId }),
      );

      const result = await handler.execute(mockCommand);

      expect(storageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        FileBucket.private,
        expect.stringContaining(`tracks/${mockTrackId}/originals/`),
        { contentType: mockFile.mimetype },
      );

      expect(audioFileRepository.create).toHaveBeenCalledWith({
        track: { connect: { id: mockTrackId } },
        bucket: FileBucket.private,
        key: expect.stringContaining(`tracks/${mockTrackId}/originals/`),
        url: mockUrl,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        format: AudioFormat.mp3,
        isOriginal: true,
        status: ProcessingStatus.pending,
        quality: 'original',
      });

      expect(processingQueue.add).toHaveBeenCalledWith('process-audio', {
        audioFileId: 'audio-id-123',
        trackId: mockTrackId,
        userId: mockUserId,
      });

      expect(result).toEqual({ audioFile: expect.objectContaining({ id: 'audio-id-123' }) });
    });

    describe('format detection', () => {
      const scenarios: {
        description: string;
        mimetype: string;
        originalname: string;
        expectedFormat: AudioFormat;
      }[] = [
        {
          description: 'detects opus',
          mimetype: 'audio/opus',
          originalname: 't.opus',
          expectedFormat: AudioFormat.opus,
        },
        {
          description: 'detects flac',
          mimetype: 'audio/flac',
          originalname: 't.flac',
          expectedFormat: AudioFormat.flac,
        },
        {
          description: 'detects wav by mime',
          mimetype: 'audio/x-wav',
          originalname: 't.wav',
          expectedFormat: AudioFormat.wav,
        },
        {
          description: 'detects aac by mime',
          mimetype: 'audio/aac',
          originalname: 't.aac',
          expectedFormat: AudioFormat.aac,
        },
        {
          description: 'falls back to extension for unknown mime (ogg)',
          mimetype: 'audio/unknown',
          originalname: 't.ogg',
          expectedFormat: AudioFormat.opus,
        },
        {
          description: 'falls back to extension for unknown mime (wav)',
          mimetype: 'audio/unknown',
          originalname: 't.wav',
          expectedFormat: AudioFormat.wav,
        },
        {
          description: 'falls back to extension for unknown mime (m4a)',
          mimetype: 'audio/unknown',
          originalname: 't.m4a',
          expectedFormat: AudioFormat.aac,
        },
        {
          description: 'falls back to extension for unknown mime (aac)',
          mimetype: 'audio/unknown',
          originalname: 't.aac',
          expectedFormat: AudioFormat.aac,
        },
        {
          description: 'falls back to extension for unknown mime (opus)',
          mimetype: 'audio/unknown',
          originalname: 't.opus',
          expectedFormat: AudioFormat.opus,
        },
        {
          description: 'falls back to extension for unknown mime (mp3)',
          mimetype: 'audio/unknown',
          originalname: 't.mp3',
          expectedFormat: AudioFormat.mp3,
        },
        {
          description: 'falls back to extension for unknown mime (flac)',
          mimetype: 'audio/unknown',
          originalname: 't.flac',
          expectedFormat: AudioFormat.flac,
        },
        {
          description: 'falls back to mp3 if all else fails',
          mimetype: 'audio/unknown',
          originalname: 't.random',
          expectedFormat: AudioFormat.mp3,
        },
      ];

      it.each(scenarios)('$description', async ({ mimetype, originalname, expectedFormat }) => {
        trackRepository.findOne.mockResolvedValue(
          buildTrackWithAccess({ id: mockTrackId }, [
            { userId: mockUserId, role: AccessRole.owner },
          ]),
        );
        storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });
        audioFileRepository.create.mockResolvedValue(
          buildAudioFile({ id: 'id', trackId: mockTrackId }),
        );

        const file = createMockMulterFile({ ...mockFile, mimetype, originalname });
        await handler.execute(new UploadTrackAudioCommand(mockTrackId, mockUserId, file));
        expect(audioFileRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ format: expectedFormat }),
        );
      });
    });
  });
});
