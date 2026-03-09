import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Track } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryTrackCommand } from '../impl/delete-library-track.command';
import { DeleteLibraryTrackHandler } from './delete-library-track.handler';

describe('DeleteLibraryTrackHandler', () => {
  let handler: DeleteLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

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

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<DeleteLibraryTrackHandler>(DeleteLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete track and remove library tracks', async () => {
    trackRepository.findOne.mockResolvedValue(mockTrack);

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
  });

  it('should throw NotFoundException if track not found or access denied', async () => {
    trackRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
