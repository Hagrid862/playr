import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { GetLibraryArtistAlbumsQuery } from '../impl/get-library-artist-albums.query';
import { GetLibraryArtistAlbumsHandler } from './get-library-artist-albums.handler';

describe('GetLibraryArtistAlbumsHandler', () => {
  let handler: GetLibraryArtistAlbumsHandler;
  let libraryRepository: LibraryRepository;
  let libraryAlbumRepository: LibraryAlbumRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistAlbumsHandler,
        {
          provide: LibraryRepository,
          useValue: {
            getByUserId: vi.fn(),
          },
        },
        {
          provide: LibraryAlbumRepository,
          useValue: {
            findMany: vi.fn(),
            count: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistAlbumsHandler>(GetLibraryArtistAlbumsHandler);
    libraryRepository = module.get<LibraryRepository>(LibraryRepository);
    libraryAlbumRepository = module.get<LibraryAlbumRepository>(LibraryAlbumRepository);
  });

  it('should return albums and total count when library exists', async () => {
    const userId = 'user-123';
    const artistId = 'artist-123';
    const mockLibrary = { id: 'lib-123' };
    const mockAlbums = [{ id: 'la-1', albumId: 'a-1' }];
    const mockTotal = 1;
    const query = new GetLibraryArtistAlbumsQuery(userId, artistId, 1, 10, 'album');

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(mockLibrary as any);
    vi.mocked(libraryAlbumRepository.findMany).mockResolvedValue(mockAlbums as any);
    vi.mocked(libraryAlbumRepository.count).mockResolvedValue(mockTotal);

    const result = await handler.execute(query);

    expect(result).toEqual({
      items: mockAlbums,
      total: mockTotal,
      page: 1,
      limit: 10,
    });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryAlbumRepository.findMany).toHaveBeenCalledWith({
      where: {
        libraryId: mockLibrary.id,
        album: { artists: { some: { id: artistId } }, type: 'album' },
      },
      take: 10,
      skip: 0,
      orderBy: {
        album: {
          releaseDate: 'desc',
        },
      },
    });
    expect(libraryAlbumRepository.count).toHaveBeenCalledWith({
      libraryId: mockLibrary.id,
      album: { artists: { some: { id: artistId } }, type: 'album' },
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    const userId = 'user-123';
    const artistId = 'artist-123';
    const query = new GetLibraryArtistAlbumsQuery(userId, artistId, 1, 10);

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryAlbumRepository.findMany).not.toHaveBeenCalled();
  });
});
