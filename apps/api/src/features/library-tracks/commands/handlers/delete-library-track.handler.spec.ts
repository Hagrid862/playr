import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket, Track } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryTrackCommand } from '../impl/delete-library-track.command';
import { DeleteLibraryTrackHandler } from './delete-library-track.handler';

describe('DeleteLibraryTrackHandler', () => {
  let handler: DeleteLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let storageService: DeepMocked<StorageService>;

  const userId = 'user-123';
  const trackId = 'track-123';
  const command = new DeleteLibraryTrackCommand(trackId, userId);

  const mockTrack: Track = {
    id: trackId,
    title: 'Test Track',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    albumId: 'album-123',
    visibility: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    trackRepository = createMock<TrackRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();
    audioFileRepository = createMock<AudioFileRepository>();
    storageService = createMock<StorageService>();

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());
    audioFileRepository.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    handler = module.get<DeleteLibraryTrackHandler>(DeleteLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete track, remove library tracks, and delete audio files', async () => {
    const mockAudioFile = {
      id: 'audio-1',
      trackId,
      bucket: FileBucket.private,
      key: 'audio/key',
      url: null,
      mimeType: 'audio/mpeg',
      size: 1000,
      format: 'mp3',
      duration: 180,
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      isOriginal: true,
      waveformJson: null,
      quality: 'original',
      status: 'complete',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    trackRepository.findOne.mockResolvedValue(mockTrack);
    audioFileRepository.findMany.mockResolvedValue([mockAudioFile as any]);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    expect(trackRepository.findOne).toHaveBeenCalledWith({
      id: trackId,
      access: { some: { userId, role: 'owner' } },
    });
    expect(trackRepository.update).toHaveBeenCalledWith(trackId, {
      deletedAt: expect.any(Date),
    });
    expect(libraryTrackRepository.deleteMany).toHaveBeenCalledWith({
      trackId,
      library: { userId },
    });
    expect(audioFileRepository.delete).toHaveBeenCalledWith('audio-1');
    expect(storageService.deleteFile).toHaveBeenCalledWith(
      FileBucket.private,
      'audio/key',
    );
  });

  it('should throw NotFoundException if track not found or access denied', async () => {
    trackRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
