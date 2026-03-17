import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { libraryArtistBuilder, libraryBuilder } from '@repo/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryArtistsQuery } from '../impl/get-library-artists.query';
import { GetLibraryArtistsHandler } from './get-library-artists.handler';

describe('GetLibraryArtistsHandler', () => {
  let handler: GetLibraryArtistsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryArtistRepository: DeepMocked<LibraryArtistRepository>;

  const userId = 'user-123';
  const page = 1;
  const limit = 10;
  const libraryId = 'lib-123';
  const mockLibrary = libraryBuilder({ id: libraryId, userId });
  const mockItems = [
    libraryArtistBuilder({ id: 'la-1', libraryId }),
    libraryArtistBuilder({ id: 'la-2', libraryId }),
  ];
  const mockTotal = 2;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryArtistRepository = createMock<LibraryArtistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistsHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryArtistRepository, useValue: libraryArtistRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistsHandler>(GetLibraryArtistsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return library artists list with metadata', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    libraryArtistRepository.findMany.mockResolvedValue(mockItems);
    libraryArtistRepository.count.mockResolvedValue(mockTotal);

    const query = new GetLibraryArtistsQuery(userId, page, limit);
    const result = await handler.execute(query);

    expect(result).toEqual({
      items: mockItems,
      total: mockTotal,
      page,
      limit,
    });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findMany).toHaveBeenCalledWith({
      where: { libraryId },
      skip: 0,
      take: limit,
    });
    expect(libraryArtistRepository.count).toHaveBeenCalledWith({ libraryId });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    const query = new GetLibraryArtistsQuery(userId, page, limit);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findMany).not.toHaveBeenCalled();
    expect(libraryArtistRepository.count).not.toHaveBeenCalled();
  });
});
