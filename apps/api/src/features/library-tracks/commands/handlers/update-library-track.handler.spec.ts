import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Track } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryTrackCommand } from '../impl/update-library-track.command';
import { UpdateLibraryTrackHandler } from './update-library-track.handler';

describe('UpdateLibraryTrackHandler', () => {
  let handler: UpdateLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let trackRepository: DeepMocked<TrackRepository>;

  const userId = 'user-123';
  const trackId = 'track-123';
  const command = new UpdateLibraryTrackCommand(
    trackId,
    {
      title: 'Updated Title',
      artistIds: ['artist-456'],
    },
    userId,
  );

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

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: TrackRepository, useValue: trackRepository },
      ],
    }).compile();

    handler = module.get<UpdateLibraryTrackHandler>(UpdateLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update track and artists', async () => {
    trackRepository.findOne.mockResolvedValue(mockTrack);
    const updatedTrack = { ...mockTrack, title: 'Updated Title' };
    trackRepository.update.mockResolvedValue(updatedTrack);

    const result = await handler.execute(command);

    expect(result).toEqual(updatedTrack);
    expect(trackRepository.findOne).toHaveBeenCalledWith({
      id: trackId,
      access: { some: { userId, role: 'owner' } },
    });

    // Check update payload structure (artistIds Connect/Disconnect logic)
    expect(trackRepository.update).toHaveBeenCalledWith(
      trackId,
      expect.objectContaining({
        title: 'Updated Title',
        artists: expect.any(Object),
      }),
    );
  });

  it('should update track without artists if artistIds not provided', async () => {
    trackRepository.findOne.mockResolvedValue(mockTrack);
    const updatedTrack = { ...mockTrack, title: 'Updated Title' };
    trackRepository.update.mockResolvedValue(updatedTrack);

    const commandNoArtists = new UpdateLibraryTrackCommand(
      trackId,
      { title: 'Updated Title' },
      userId,
    );
    const result = await handler.execute(commandNoArtists);

    expect(result).toEqual(updatedTrack);
    expect(trackRepository.update).toHaveBeenCalledWith(
      trackId,
      expect.objectContaining({
        title: 'Updated Title',
        artists: undefined,
      }),
    );
  });

  it('should throw NotFoundException if track not found or access denied', async () => {
    trackRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    trackRepository.findOne.mockResolvedValue(mockTrack);
    // Return track with invalid data for schema
    trackRepository.update.mockResolvedValue({ ...mockTrack, title: 123 as any });

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
