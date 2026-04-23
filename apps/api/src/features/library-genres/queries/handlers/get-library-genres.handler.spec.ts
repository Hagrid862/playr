import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GenreKind } from '@repo/db';
import { libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryGenresQuery } from '../impl/get-library-genres.query';
import { GetLibraryGenresHandler } from './get-library-genres.handler';

describe('GetLibraryGenresHandler', () => {
  let handler: GetLibraryGenresHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const userId = 'user-1';
  const library = {
    ...libraryBuilder({ id: 'lib-1', userId }),
    user: userBuilder({ id: userId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;

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
    const items = [
      {
        id: 'g1',
        name: 'Rock',
        slug: 'rock',
        description: null,
        kind: GenreKind.custom,
        libraryId: library.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        library,
      },
    ] as Awaited<ReturnType<GenreRepository['findMany']>>;
    const query = new GetLibraryGenresQuery(userId, 2, 10, 'rock', GenreKind.custom);
    libraryRepository.findOne.mockResolvedValue(library);
    genreRepository.findMany.mockResolvedValue(items);
    genreRepository.count.mockResolvedValue(25);

    const result = await handler.execute(query);

    expect(result).toEqual({
      items,
      total: 25,
      page: 2,
      limit: 10,
    });
    expect(genreRepository.findMany).toHaveBeenCalledWith(
      {
        kind: GenreKind.custom,
        OR: [{ libraryId: null }, { libraryId: library.id }],
        AND: [
          {
            OR: [
              { name: { contains: 'rock', mode: 'insensitive' } },
              { slug: { contains: 'rock', mode: 'insensitive' } },
            ],
          },
        ],
      },
      {
        skip: 10,
        take: 10,
      },
    );
    expect(genreRepository.count).toHaveBeenCalledWith({
      kind: GenreKind.custom,
      OR: [{ libraryId: null }, { libraryId: library.id }],
      AND: [
        {
          OR: [
            { name: { contains: 'rock', mode: 'insensitive' } },
            { slug: { contains: 'rock', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('should throw PreconditionFailedException when library missing', async () => {
    const query = new GetLibraryGenresQuery(userId, 1, 20);
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
