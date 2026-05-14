import { AlbumRepository } from '@/shared/repositories/album.repository';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumType, Track, Visibility } from '@repo/db';
import { albumBuilder, libraryBuilder, trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryTrackCommand } from '../impl/create-library-track.command';
import { CreateLibraryTrackHandler } from './create-library-track.handler';

describe('CreateLibraryTrackHandler', () => {
  let handler: CreateLibraryTrackHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let albumRepository: DeepMocked<AlbumRepository>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const userId = 'user-123';
  const command = new CreateLibraryTrackCommand(
    {
      title: 'Test Track',
      albumId: 'album-123',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
      artistIds: ['artist-123'],
    },
    userId,
  );

  const mockLibrary = libraryBuilder({
    id: 'library-123',
    userId,
  });

  const mockAlbum = albumBuilder({
    id: 'album-123',
    name: 'Test Album',
    description: 'Test Description',
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: Visibility.private,
  });

  const mockTrack: Track = trackBuilder({
    id: 'track-123',
    title: 'Test Track',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    explicit: false,
    albumId: 'album-123',
    visibility: Visibility.private,
  });

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    libraryRepository = createMock<LibraryRepository>();
    albumRepository = createMock<AlbumRepository>();
    trackRepository = createMock<TrackRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();
    genreRepository = createMock<GenreRepository>();

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryTrackHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
        { provide: GenreRepository, useValue: genreRepository },
      ],
    }).compile();

    handler = module.get<CreateLibraryTrackHandler>(CreateLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a track and link to library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue(mockTrack);

    const result = await handler.execute(command);

    expect(result).toEqual(mockTrack);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(albumRepository.findOne).toHaveBeenCalledWith({ id: command.body.albumId });
    expect(trackRepository.create).toHaveBeenCalled();
    expect(libraryTrackRepository.create).toHaveBeenCalledWith({
      track: { connect: { id: mockTrack.id } },
      library: { connect: { id: mockLibrary.id } },
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw PreconditionFailedException if album not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    // @ts-expect-error - we are testing the validation failure
    trackRepository.create.mockResolvedValue({ ...mockTrack, title: 123 });

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw BadRequestException when genre ids are not assignable', async () => {
    const genreCommand = new CreateLibraryTrackCommand(
      {
        ...command.body,
        genreIds: ['g1'],
      },
      userId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(genreCommand)).rejects.toThrow(BadRequestException);
    expect(unitOfWork.runInTransaction).not.toHaveBeenCalled();
  });

  it('should dedupe genre ids when creating track', async () => {
    const genreCommand = new CreateLibraryTrackCommand(
      {
        ...command.body,
        genreIds: ['g1', 'g1', 'g2'],
      },
      userId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);
    trackRepository.create.mockResolvedValue(mockTrack);

    await handler.execute(genreCommand);

    expect(genreRepository.areGenreIdsAssignableToLibrary).toHaveBeenCalledWith(mockLibrary.id, [
      'g1',
      'g2',
    ]);
    expect(trackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: {
          create: [{ genre: { connect: { id: 'g1' } } }, { genre: { connect: { id: 'g2' } } }],
        },
      }),
    );
  });
});
