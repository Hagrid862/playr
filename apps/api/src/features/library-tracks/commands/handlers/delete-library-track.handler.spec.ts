import { PlaybackGateway } from '@/features/playback/playback.gateway';
import { PlaybackStatePersistenceService } from '@/features/playback/services/playback-state-persistence.service';
import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type Track, AudioFormat, FileBucket, ProcessingStatus, Visibility } from '@repo/db';
import { PlaybackState } from '@repo/contracts';
import { audioFileBuilder, trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryTrackCommand } from '../impl/delete-library-track.command';
import { DeleteLibraryTrackHandler } from './delete-library-track.handler';
import { playbackStateFixture } from '../../../playback/test-utils/playback-state.fixture';

describe('DeleteLibraryTrackHandler', () => {
  let handler: DeleteLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let storageService: DeepMocked<StorageService>;
  let playbackStatePersistence: DeepMocked<PlaybackStatePersistenceService>;
  let playbackGateway: DeepMocked<PlaybackGateway>;

  const userId = 'user-123';
  const trackId = 'track-123';
  const command = new DeleteLibraryTrackCommand(trackId, userId);

  const mockTrack: Track = trackBuilder({
    id: trackId,
    title: 'Test Track',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    albumId: 'album-123',
    visibility: Visibility.private,
  });

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    trackRepository = createMock<TrackRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();
    audioFileRepository = createMock<AudioFileRepository>();
    storageService = createMock<StorageService>();
    playbackStatePersistence = createMock<PlaybackStatePersistenceService>();
    playbackGateway = createMock<PlaybackGateway>();

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());
    audioFileRepository.listByTrackId.mockResolvedValue([]);
    libraryTrackRepository.listIdsByTrackAndUser.mockResolvedValue(['library-track-1']);
    playbackStatePersistence.purgeDeletedLibraryTrack.mockResolvedValue({ kind: 'unchanged' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: StorageService, useValue: storageService },
        { provide: PlaybackStatePersistenceService, useValue: playbackStatePersistence },
        { provide: PlaybackGateway, useValue: playbackGateway },
      ],
    }).compile();

    handler = module.get<DeleteLibraryTrackHandler>(DeleteLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should soft delete track, remove library tracks, and delete audio files', async () => {
    const mockAudioFile = audioFileBuilder({
      id: 'audio-1',
      trackId,
      bucket: FileBucket.private,
      key: 'audio/key',
      mimeType: 'audio/mpeg',
      size: 1000,
      format: AudioFormat.mp3,
      duration: 180,
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      status: ProcessingStatus.complete,
    });
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    audioFileRepository.listByTrackId.mockResolvedValue([mockAudioFile]);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    expect(trackRepository.getByIdForOwner).toHaveBeenCalledWith(trackId, userId);
    expect(trackRepository.softDelete).toHaveBeenCalledWith(trackId);
    expect(libraryTrackRepository.listIdsByTrackAndUser).toHaveBeenCalledWith(trackId, userId);
    expect(libraryTrackRepository.deleteMany).toHaveBeenCalledWith(['library-track-1']);
    expect(audioFileRepository.delete).toHaveBeenCalledWith('audio-1');
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.private, 'audio/key');
    expect(playbackStatePersistence.purgeDeletedLibraryTrack).toHaveBeenCalledWith(userId, trackId);
    expect(playbackGateway.emitPlaybackStateToUserRoom).not.toHaveBeenCalled();
    expect(playbackGateway.emitPlaybackSessionEndedToUserRoom).not.toHaveBeenCalled();
  });

  it('broadcasts updated playback state when purge returns updated', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    audioFileRepository.listByTrackId.mockResolvedValue([]);
    const nextState: PlaybackState = playbackStateFixture({ userId, version: 3 });
    playbackStatePersistence.purgeDeletedLibraryTrack.mockResolvedValue({
      kind: 'updated',
      state: nextState,
    });

    await handler.execute(command);

    expect(playbackGateway.emitPlaybackStateToUserRoom).toHaveBeenCalledWith(userId, nextState);
    expect(playbackGateway.emitPlaybackSessionEndedToUserRoom).not.toHaveBeenCalled();
  });

  it('broadcasts session ended when purge removes playback document', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    audioFileRepository.listByTrackId.mockResolvedValue([]);
    playbackStatePersistence.purgeDeletedLibraryTrack.mockResolvedValue({ kind: 'removed' });

    await handler.execute(command);

    expect(playbackGateway.emitPlaybackSessionEndedToUserRoom).toHaveBeenCalledWith(userId);
    expect(playbackGateway.emitPlaybackStateToUserRoom).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if track not found or access denied', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(null);

    const err = await handler.execute(command).catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toBe('Track not found or you do not have permission to delete it');
    expect(trackRepository.getByIdForOwner).toHaveBeenCalledWith(trackId, userId);
  });

  it('should handle track with zero audio files', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    audioFileRepository.listByTrackId.mockResolvedValue([]);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    expect(trackRepository.softDelete).toHaveBeenCalledWith(trackId);
    expect(libraryTrackRepository.listIdsByTrackAndUser).toHaveBeenCalledWith(trackId, userId);
    expect(libraryTrackRepository.deleteMany).toHaveBeenCalledWith(['library-track-1']);
    expect(audioFileRepository.delete).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('should delete multiple audio files and cleanup from storage', async () => {
    const mockAudioFile1 = audioFileBuilder({
      id: 'audio-1',
      trackId,
      bucket: FileBucket.private,
      key: 'audio/key1',
      mimeType: 'audio/mpeg',
      size: 1000,
      format: AudioFormat.mp3,
      duration: 180,
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      status: ProcessingStatus.complete,
    });
    const mockAudioFile2 = audioFileBuilder({
      ...mockAudioFile1,
      id: 'audio-2',
      key: 'audio/key2',
    });
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    audioFileRepository.listByTrackId.mockResolvedValue([mockAudioFile1, mockAudioFile2]);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    expect(audioFileRepository.delete).toHaveBeenCalledWith('audio-1');
    expect(audioFileRepository.delete).toHaveBeenCalledWith('audio-2');
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.private, 'audio/key1');
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.private, 'audio/key2');
  });

  it('should log error when storage delete fails but still return track', async () => {
    const mockAudioFile = audioFileBuilder({
      id: 'audio-1',
      trackId,
      bucket: FileBucket.private,
      key: 'audio/key',
      mimeType: 'audio/mpeg',
      size: 1000,
      format: AudioFormat.mp3,
      duration: 180,
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      status: ProcessingStatus.complete,
    });
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    audioFileRepository.listByTrackId.mockResolvedValue([mockAudioFile]);
    storageService.deleteFile.mockRejectedValue(new Error('S3 delete failed'));

    const loggerSpy = vi.spyOn(handler['logger'], 'error');

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    await vi.waitFor(() => {
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to cleanup audio file from S3: ${mockAudioFile.key}`,
        expect.any(Error),
      );
    });
  });
});
