import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildLibrary, buildLibraryAlbum } from '@repo/testing';
import { GetLibraryAlbumsQuery } from '../impl/get-library-albums.query';
import { GetLibraryAlbumsHandler } from './get-library-albums.handler';

describe('GetLibraryAlbumsHandler', () => {
  let handler: GetLibraryAlbumsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryAlbumRepository: DeepMocked<LibraryAlbumRepository>;

  const mockUserId = 'user-123';
  const mockLibraryId = 'library-123';

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

  it('should return library albums successfully', async () => {
    const query = new GetLibraryAlbumsQuery(mockUserId, 1, 10);
    const mockItems = [
      buildLibraryAlbum({ id: 'album-1', libraryId: mockLibraryId }),
      buildLibraryAlbum({ id: 'album-2', libraryId: mockLibraryId }),
    ];
    const mockTotal = 2;

    libraryRepository.getByUserId.mockResolvedValue(buildLibrary({ id: mockLibraryId }));
    libraryAlbumRepository.findMany.mockResolvedValue(mockItems);
    libraryAlbumRepository.count.mockResolvedValue(mockTotal);

    const result = await handler.execute(query);

    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(mockTotal);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should throw PreconditionFailedException if user library not found', async () => {
    const query = new GetLibraryAlbumsQuery(mockUserId, 1, 10);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
