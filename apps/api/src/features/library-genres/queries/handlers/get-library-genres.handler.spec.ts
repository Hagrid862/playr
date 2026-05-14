import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GenreKind } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryGenresQuery } from '../impl/get-library-genres.query';
import { GetLibraryGenresHandler } from './get-library-genres.handler';

describe('GetLibraryGenresHandler', () => {
  let handler: GetLibraryGenresHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const userId = 'user-1';
  const library = libraryBuilder({ id: 'lib-1', userId });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    genreRepository = createMock<GenreRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryGenresHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreRepository, useValue: genreRepository },
      ],
    }).compile();

    handler = module.get(GetLibraryGenresHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return items, total, page, limit', async () => {
    const items = [{ id: 'g1' }] as any[];
    const query = new GetLibraryGenresQuery(userId, 2, 10, 'rock', GenreKind.custom);
    libraryRepository.getByUserId.mockResolvedValue(library);
    genreRepository.findForLibraryList.mockResolvedValue(items);
    genreRepository.countForLibraryList.mockResolvedValue(25);

    const result = await handler.execute(query);

    expect(result).toEqual({
      items,
      total: 25,
      page: 2,
      limit: 10,
    });
    expect(genreRepository.findForLibraryList).toHaveBeenCalledWith({
      libraryId: library.id,
      q: 'rock',
      kind: GenreKind.custom,
      skip: 10,
      take: 10,
    });
    expect(genreRepository.countForLibraryList).toHaveBeenCalledWith({
      libraryId: library.id,
      q: 'rock',
      kind: GenreKind.custom,
    });
  });

  it('should throw PreconditionFailedException when library missing', async () => {
    const query = new GetLibraryGenresQuery(userId, 1, 20);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
