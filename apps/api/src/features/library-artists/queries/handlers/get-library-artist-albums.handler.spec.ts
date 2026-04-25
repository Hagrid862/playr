import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryAlbumGetPayload } from '@repo/db';
import {
  albumBuilder,
  artistBuilder,
  libraryAlbumBuilder,
  libraryBuilder,
  userBuilder,
} from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryArtistAlbumsQuery } from '../impl/get-library-artist-albums.query';
import { GetLibraryArtistAlbumsHandler } from './get-library-artist-albums.handler';

/** Matches the `include` shape passed in `get-library-artist-albums.handler` → `findManyWithInclude`. */
type LibraryAlbumWithHandlerInclude = LibraryAlbumGetPayload<{
  include: { album: { include: { artists: true; cover: true } } };
}>;

describe('GetLibraryArtistAlbumsHandler', () => {
  let handler: GetLibraryArtistAlbumsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryAlbumRepository: DeepMocked<LibraryAlbumRepository>;

  const userId = 'user-123';
  const artistId = 'artist-123';
  const libraryId = 'lib-123';
  const mockLibrary = {
    ...libraryBuilder({ id: libraryId, userId }),
    user: userBuilder({ id: userId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;
  const mockAlbums: LibraryAlbumWithHandlerInclude[] = [
    {
      ...libraryAlbumBuilder({ id: 'la-1', libraryId, albumId: 'a-1' }),
      album: {
        ...albumBuilder({ id: 'a-1', type: 'album' }),
        artists: [artistBuilder()],
        cover: null,
      },
    },
  ];
  const mockTotal = 1;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryAlbumRepository = createMock<LibraryAlbumRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistAlbumsHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryAlbumRepository, useValue: libraryAlbumRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistAlbumsHandler>(GetLibraryArtistAlbumsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return albums and total count when library exists', async () => {
    const query = new GetLibraryArtistAlbumsQuery(userId, artistId, 1, 10, 'album');

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    libraryAlbumRepository.findManyWithInclude.mockResolvedValue(mockAlbums);
    libraryAlbumRepository.count.mockResolvedValue(mockTotal);

    const result = await handler.execute(query);

    expect(result).toEqual({
      items: mockAlbums,
      total: mockTotal,
      page: 1,
      limit: 10,
    });
    expect(libraryRepository.findOne).toHaveBeenCalledWith({ userId });
    expect(libraryAlbumRepository.findManyWithInclude).toHaveBeenCalledWith(
      {
        libraryId: mockLibrary.id,
        album: { artists: { some: { id: artistId } }, type: 'album' },
      },
      {
        album: {
          include: {
            artists: true,
            cover: true,
          },
        },
      },
      {
        take: 10,
        skip: 0,
        orderBy: {
          album: {
            releaseDate: 'desc',
          },
        },
      },
    );
    expect(libraryAlbumRepository.count).toHaveBeenCalledWith({
      libraryId: mockLibrary.id,
      album: { artists: { some: { id: artistId } }, type: 'album' },
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    const query = new GetLibraryArtistAlbumsQuery(userId, artistId, 1, 10);

    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(libraryRepository.findOne).toHaveBeenCalledWith({ userId });
    expect(libraryAlbumRepository.findManyWithInclude).not.toHaveBeenCalled();
  });
});
