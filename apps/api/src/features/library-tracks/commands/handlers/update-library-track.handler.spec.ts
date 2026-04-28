import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Track } from '@repo/db';
import { trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryTrackCommand } from '../impl/update-library-track.command';
import { UpdateLibraryTrackHandler } from './update-library-track.handler';

describe('UpdateLibraryTrackHandler', () => {
  let handler: UpdateLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

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

  const mockTrack: Track = trackBuilder({
    id: trackId,
    title: 'Test Track',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    albumId: 'album-123',
    visibility: 'private',
  });

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    trackRepository = createMock<TrackRepository>();
    libraryRepository = createMock<LibraryRepository>();
    genreRepository = createMock<GenreRepository>();

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());
    libraryRepository.getByUserId.mockResolvedValue({ id: 'library-123', userId } as any);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreRepository, useValue: genreRepository },
      ],
    }).compile();

    handler = module.get<UpdateLibraryTrackHandler>(UpdateLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update track and artists', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    const updatedTrack = { ...mockTrack, title: 'Updated Title' };
    trackRepository.update.mockResolvedValue(updatedTrack);

    const result = await handler.execute(command);

    expect(result).toEqual(updatedTrack);
    expect(trackRepository.getByIdForOwner).toHaveBeenCalledWith(trackId, userId);

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
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
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
    trackRepository.getByIdForOwner.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    trackRepository.update.mockResolvedValue({ ...mockTrack, title: 123 } as unknown as Track);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw PreconditionFailedException when genreIds set but library missing', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    libraryRepository.getByUserId.mockResolvedValue(null);
    const cmd = new UpdateLibraryTrackCommand(trackId, { genreIds: ['g1'] }, userId);

    await expect(handler.execute(cmd)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw BadRequestException when genres are not assignable', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    libraryRepository.getByUserId.mockResolvedValue({ id: 'library-123', userId } as any);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(false);
    const cmd = new UpdateLibraryTrackCommand(trackId, { genreIds: ['g1'] }, userId);

    await expect(handler.execute(cmd)).rejects.toThrow(BadRequestException);
  });

  it('should replace genres with deduped ids', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    const updatedTrack = { ...mockTrack };
    trackRepository.update.mockResolvedValue(updatedTrack);
    const cmd = new UpdateLibraryTrackCommand(trackId, { genreIds: ['g1', 'g2', 'g1'] }, userId);

    await handler.execute(cmd);

    expect(genreRepository.areGenreIdsAssignableToLibrary).toHaveBeenCalledWith('library-123', [
      'g1',
      'g2',
    ]);
    expect(trackRepository.update).toHaveBeenCalledWith(
      trackId,
      expect.objectContaining({
        genres: {
          deleteMany: {},
          create: [{ genre: { connect: { id: 'g1' } } }, { genre: { connect: { id: 'g2' } } }],
        },
      }),
    );
  });

  it('should clear genres when genreIds is empty', async () => {
    trackRepository.getByIdForOwner.mockResolvedValue(mockTrack);
    trackRepository.update.mockResolvedValue(mockTrack);
    const cmd = new UpdateLibraryTrackCommand(trackId, { genreIds: [] }, userId);

    await handler.execute(cmd);

    expect(trackRepository.update).toHaveBeenCalledWith(
      trackId,
      expect.objectContaining({
        genres: { deleteMany: {}, create: [] },
      }),
    );
  });
});
