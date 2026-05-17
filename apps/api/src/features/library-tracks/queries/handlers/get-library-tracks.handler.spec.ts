import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Library, LibraryTrack, LibraryTrackGetPayload, Track } from '@repo/db';
import { libraryBuilder, libraryTrackBuilder, trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';
import { GetLibraryTracksHandler } from './get-library-tracks.handler';

type LibraryTrackWithTrack = LibraryTrackGetPayload<{
  include: { track: true };
}>;

describe('GetLibraryTracksHandler', () => {
  let handler: GetLibraryTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const query = new GetLibraryTracksQuery(userId, 1, 10);

  const mockLibrary: Library = libraryBuilder({
    id: 'library-123',
    userId,
  });

  const mockTrack: Track = trackBuilder({ id: 'track-123' });

  const mockLibraryTrack: LibraryTrack = libraryTrackBuilder({
    id: 'lib-track-123',
    libraryId: mockLibrary.id,
    trackId: mockTrack.id,
  });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryTracksHandler>(GetLibraryTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated library tracks', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);

    const mockItem: LibraryTrackWithTrack = {
      ...mockLibraryTrack,
      track: mockTrack,
    };

    libraryTrackRepository.getPaginated.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    const result = await handler.execute(query);

    expect(result.items).toEqual([mockTrack]);
    expect(result.total).toBe(1);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryTrackRepository.getPaginated).toHaveBeenCalledWith(
      1,
      10,
      { libraryId: mockLibrary.id, track: {} },
      [{ track: { trackNumber: 'asc' } }, { track: { id: 'asc' } }],
      {
        include: {
          track: {
            include: {
              artists: true,
              album: { include: { cover: true } },
              genres: { include: { genre: true } },
            },
          },
        },
      },
    );
  });

  it('should filter by albumId if provided', async () => {
    const albumQuery = new GetLibraryTracksQuery(userId, 1, 10, 'album-123');
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    const mockItem: LibraryTrackWithTrack = { ...mockLibraryTrack, track: mockTrack };
    libraryTrackRepository.getPaginated.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    await handler.execute(albumQuery);

    expect(libraryTrackRepository.getPaginated).toHaveBeenCalledWith(
      1,
      10,
      {
        libraryId: mockLibrary.id,
        track: { albumId: 'album-123' },
      },
      [{ track: { trackNumber: 'asc' } }, { track: { id: 'asc' } }],
      expect.objectContaining({ include: expect.any(Object) }),
    );
  });

  it('should filter by genreId if provided', async () => {
    const genreId = 'genre-456';
    const genreQuery = new GetLibraryTracksQuery(userId, 1, 10, undefined, genreId);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    const mockItem: LibraryTrackWithTrack = { ...mockLibraryTrack, track: mockTrack };
    libraryTrackRepository.getPaginated.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    await handler.execute(genreQuery);

    const expectedWhere = {
      libraryId: mockLibrary.id,
      track: { genres: { some: { genreId } } },
    };

    expect(libraryTrackRepository.getPaginated).toHaveBeenCalledWith(
      1,
      10,
      expectedWhere,
      [{ track: { trackNumber: 'asc' } }, { track: { id: 'asc' } }],
      expect.objectContaining({ include: expect.any(Object) }),
    );
    expect(libraryTrackRepository.count).toHaveBeenCalledWith(expectedWhere);
  });

  it('should filter by albumId and genreId when both are provided', async () => {
    const genreQuery = new GetLibraryTracksQuery(userId, 1, 10, 'album-123', 'genre-456');
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    const mockItem: LibraryTrackWithTrack = { ...mockLibraryTrack, track: mockTrack };
    libraryTrackRepository.getPaginated.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    await handler.execute(genreQuery);

    const expectedWhere = {
      libraryId: mockLibrary.id,
      track: {
        albumId: 'album-123',
        genres: { some: { genreId: 'genre-456' } },
      },
    };

    expect(libraryTrackRepository.getPaginated).toHaveBeenCalledWith(
      1,
      10,
      expectedWhere,
      [{ track: { trackNumber: 'asc' } }, { track: { id: 'asc' } }],
      expect.objectContaining({ include: expect.any(Object) }),
    );
    expect(libraryTrackRepository.count).toHaveBeenCalledWith(expectedWhere);
  });

  it('should use Prisma orderBy when sorting by title', async () => {
    const titleQuery = new GetLibraryTracksQuery(
      userId,
      1,
      10,
      undefined,
      undefined,
      'title',
      'asc',
    );
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    const mockItem: LibraryTrackWithTrack = { ...mockLibraryTrack, track: mockTrack };
    libraryTrackRepository.getPaginated.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    await handler.execute(titleQuery);

    expect(libraryTrackRepository.getPaginated).toHaveBeenCalledWith(
      1,
      10,
      { libraryId: mockLibrary.id, track: {} },
      [{ track: { title: 'asc' } }, { track: { id: 'asc' } }],
      expect.objectContaining({ include: expect.any(Object) }),
    );
    expect(libraryTrackRepository.getIdsPaginatedByMinArtistName).not.toHaveBeenCalled();
  });

  it('should use raw SQL artist path when sorting by artist', async () => {
    const artistQuery = new GetLibraryTracksQuery(
      userId,
      2,
      10,
      undefined,
      undefined,
      'artist',
      'desc',
    );
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    const mockItem: LibraryTrackWithTrack = { ...mockLibraryTrack, track: mockTrack };
    libraryTrackRepository.getIdsPaginatedByMinArtistName.mockResolvedValue([mockLibraryTrack.id]);
    libraryTrackRepository.findManyByIdsOrdered.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    const result = await handler.execute(artistQuery);

    expect(result.items).toEqual([mockTrack]);
    expect(libraryTrackRepository.getPaginated).not.toHaveBeenCalled();
    expect(libraryTrackRepository.getIdsPaginatedByMinArtistName).toHaveBeenCalledWith({
      libraryId: mockLibrary.id,
      albumId: undefined,
      genreId: undefined,
      page: 2,
      limit: 10,
      sortOrder: 'desc',
    });
    expect(libraryTrackRepository.findManyByIdsOrdered).toHaveBeenCalledWith(
      [mockLibraryTrack.id],
      expect.objectContaining({ include: expect.any(Object) }),
    );
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
