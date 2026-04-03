import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryAlbumBuilder, libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryAlbumsQuery } from '../impl/get-library-albums.query';
import { GetLibraryAlbumsHandler } from './get-library-albums.handler';

describe('GetLibraryAlbumsHandler', () => {
  let handler: GetLibraryAlbumsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryAlbumRepository: DeepMocked<LibraryAlbumRepository>;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryAlbumRepository = createMock<LibraryAlbumRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryAlbumsHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryAlbumRepository, useValue: libraryAlbumRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryAlbumsHandler>(GetLibraryAlbumsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return library albums with pagination metadata', async () => {
    const userId = 'user-123';
    const libraryId = 'lib-123';
    const query = new GetLibraryAlbumsQuery(userId, 1, 10);
    const library = libraryBuilder({ id: libraryId });
    const albums = [
      libraryAlbumBuilder({ id: 'lib-album-1', libraryId, albumId: 'album-1' }),
      libraryAlbumBuilder({ id: 'lib-album-2', libraryId, albumId: 'album-2' }),
    ];
    const total = 2;

    libraryRepository.getByUserId.mockResolvedValue(library);
    libraryAlbumRepository.findMany.mockResolvedValue(albums);
    libraryAlbumRepository.count.mockResolvedValue(total);

    const result = await handler.execute(query);

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryAlbumRepository.findMany).toHaveBeenCalledWith({
      where: { libraryId: library.id },
      take: 10,
      skip: 0,
    });
    expect(libraryAlbumRepository.count).toHaveBeenCalledWith({ libraryId: library.id });
    expect(result).toEqual({
      items: albums,
      total,
      page: 1,
      limit: 10,
    });
  });

  it('should throw PreconditionFailedException if user library not found', async () => {
    const userId = 'user-123';
    const query = new GetLibraryAlbumsQuery(userId, 1, 10);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    await expect(handler.execute(query)).rejects.toThrow('User library not found');
  });

  it('should throw PreconditionFailedException if failed to parse library albums', async () => {
    const userId = 'user-123';
    const query = new GetLibraryAlbumsQuery(userId, 1, 10);
    const library = libraryBuilder({ id: 'lib-123' });
    const invalidAlbums = [{ invalidField: 'test' }] as any[];
    const total = 1;

    libraryRepository.getByUserId.mockResolvedValue(library);
    libraryAlbumRepository.findMany.mockResolvedValue(invalidAlbums);
    libraryAlbumRepository.count.mockResolvedValue(total);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    await expect(handler.execute(query)).rejects.toThrow('Failed to parse library albums');
  });
});
