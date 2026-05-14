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
import { TrackSchema } from '@repo/contracts';
import { AlbumType, Track, Visibility } from '@repo/db';
import { albumBuilder, libraryBuilder, trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { BulkCreateLibraryTracksCommand } from '../impl/bulk-create-library-tracks.command';
import { BulkCreateLibraryTracksHandler } from './bulk-create-library-tracks.handler';

describe('BulkCreateLibraryTracksHandler', () => {
  let handler: BulkCreateLibraryTracksHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let albumRepository: DeepMocked<AlbumRepository>;
  let trackRepository: DeepMocked<TrackRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const userId = 'user-123';
  const albumId = 'album-123';
  const libraryId = 'library-123';

  const body = {
    tracks: [
      {
        title: 'Track 1',
        trackNumber: 1,
        diskNumber: 1,
        explicit: false,
        artistIds: ['artist-1'],
      },
      {
        title: 'Track 2',
        trackNumber: 2,
        diskNumber: 1,
        explicit: true,
        artistIds: ['artist-2'],
      },
    ],
  };

  const mockLibrary = libraryBuilder({
    id: libraryId,
    userId,
  });

  const mockAlbum = albumBuilder({
    id: albumId,
    name: 'Test Album',
    description: 'Test Description',
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: Visibility.private,
  });

  const mockTrack1: Track = trackBuilder({
    id: 'track-1',
    title: 'Track 1',
    trackNumber: 1,
    diskNumber: 1,
    duration: 0,
    explicit: false,
    albumId,
    visibility: Visibility.private,
  });

  const mockTrack2: Track = trackBuilder({
    id: 'track-2',
    title: 'Track 2',
    trackNumber: 2,
    diskNumber: 1,
    duration: 0,
    explicit: true,
    albumId,
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
        BulkCreateLibraryTracksHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: TrackRepository, useValue: trackRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
        { provide: GenreRepository, useValue: genreRepository },
      ],
    }).compile();

    handler = module.get<BulkCreateLibraryTracksHandler>(BulkCreateLibraryTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should create multiple tracks and link them to library', async () => {
    const command = new BulkCreateLibraryTracksCommand(albumId, body, userId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValueOnce(mockTrack1).mockResolvedValueOnce(mockTrack2);

    const result = await handler.execute(command);

    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0]).toEqual(mockTrack1);
    expect(result.tracks[1]).toEqual(mockTrack2);

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(albumRepository.getById).toHaveBeenCalledWith(albumId);
    expect(unitOfWork.runInTransaction).toHaveBeenCalled();

    expect(trackRepository.create).toHaveBeenCalledTimes(2);
    expect(trackRepository.create).toHaveBeenNthCalledWith(1, {
      title: body.tracks[0].title,
      trackNumber: body.tracks[0].trackNumber,
      diskNumber: body.tracks[0].diskNumber,
      duration: 0,
      explicit: body.tracks[0].explicit,
      visibility: Visibility.private,
      album: { connect: { id: albumId } },
      artists: { connect: body.tracks[0].artistIds.map((id) => ({ id })) },
      access: {
        create: {
          userId,
          role: 'owner',
        },
      },
    });
    expect(trackRepository.create).toHaveBeenNthCalledWith(2, {
      title: body.tracks[1].title,
      trackNumber: body.tracks[1].trackNumber,
      diskNumber: body.tracks[1].diskNumber,
      duration: 0,
      explicit: body.tracks[1].explicit,
      visibility: Visibility.private,
      album: { connect: { id: albumId } },
      artists: { connect: body.tracks[1].artistIds.map((id) => ({ id })) },
      access: {
        create: {
          userId,
          role: 'owner',
        },
      },
    });

    expect(libraryTrackRepository.create).toHaveBeenCalledTimes(2);
    expect(libraryTrackRepository.create).toHaveBeenNthCalledWith(1, {
      track: { connect: { id: mockTrack1.id } },
      library: { connect: { id: mockLibrary.id } },
    });
    expect(libraryTrackRepository.create).toHaveBeenNthCalledWith(2, {
      track: { connect: { id: mockTrack2.id } },
      library: { connect: { id: mockLibrary.id } },
    });
  });

  it('should create a single track when body has one track', async () => {
    const singleTrackBody = { tracks: [body.tracks[0]] };
    const command = new BulkCreateLibraryTracksCommand(albumId, singleTrackBody, userId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue(mockTrack1);

    const result = await handler.execute(command);

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]).toEqual(mockTrack1);
    expect(trackRepository.create).toHaveBeenCalledTimes(1);
    expect(libraryTrackRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    const command = new BulkCreateLibraryTracksCommand(albumId, body, userId);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    await expect(handler.execute(command)).rejects.toThrow('User library not found');

    expect(albumRepository.getById).not.toHaveBeenCalled();
    expect(trackRepository.create).not.toHaveBeenCalled();
  });

  it('should throw PreconditionFailedException if album not found', async () => {
    const command = new BulkCreateLibraryTracksCommand(albumId, body, userId);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    await expect(handler.execute(command)).rejects.toThrow('Album not found');

    expect(trackRepository.create).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException if TrackSchema validation fails', async () => {
    const command = new BulkCreateLibraryTracksCommand(albumId, body, userId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue({ ...mockTrack1, title: 123 } as unknown as Track);

    vi.spyOn(TrackSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new z.ZodError([]),
    } as ReturnType<typeof TrackSchema.safeParse>);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
    await expect(handler.execute(command)).rejects.toThrow('Failed to parse track');
  });

  it('should run all operations within transaction', async () => {
    const command = new BulkCreateLibraryTracksCommand(albumId, body, userId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValueOnce(mockTrack1).mockResolvedValueOnce(mockTrack2);

    await handler.execute(command);

    expect(unitOfWork.runInTransaction).toHaveBeenCalledTimes(1);
    const transactionCallback = unitOfWork.runInTransaction.mock.calls[0][0];
    expect(typeof transactionCallback).toBe('function');
  });

  it('should throw BadRequestException when bulk genre ids are not assignable', async () => {
    const command = new BulkCreateLibraryTracksCommand(
      albumId,
      {
        tracks: [{ ...body.tracks[0], genreIds: ['g1'] }],
      },
      userId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(trackRepository.create).not.toHaveBeenCalled();
  });

  it('should create track with genre relations when genreIds are non-empty', async () => {
    const command = new BulkCreateLibraryTracksCommand(
      albumId,
      {
        tracks: [{ ...body.tracks[0], genreIds: ['g1', 'g1'] }],
      },
      userId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue(mockTrack1);

    await handler.execute(command);

    expect(trackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: {
          create: [{ genre: { connect: { id: 'g1' } } }],
        },
      }),
    );
  });

  it('should connect multiple artists when artistIds has multiple ids', async () => {
    const multiArtistBody = {
      tracks: [
        {
          ...body.tracks[0],
          artistIds: ['artist-1', 'artist-2', 'artist-3'],
        },
      ],
    };
    const command = new BulkCreateLibraryTracksCommand(albumId, multiArtistBody, userId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(mockAlbum);
    trackRepository.create.mockResolvedValue(mockTrack1);

    await handler.execute(command);

    expect(trackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        artists: {
          connect: [{ id: 'artist-1' }, { id: 'artist-2' }, { id: 'artist-3' }],
        },
      }),
    );
  });
});
