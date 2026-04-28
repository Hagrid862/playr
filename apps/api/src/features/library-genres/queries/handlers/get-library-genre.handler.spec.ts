import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GenreSchema } from '@repo/contracts';
import { GenreKind } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryGenreQuery } from '../impl/get-library-genre.query';
import { GetLibraryGenreHandler } from './get-library-genre.handler';

const mockGenre = {
  id: 'g1',
  name: 'Rock',
  slug: 'rock',
  description: null,
  kind: GenreKind.system,
  libraryId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
};

describe('GetLibraryGenreHandler', () => {
  let handler: GetLibraryGenreHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const userId = 'user-1';
  const library = libraryBuilder({ id: 'lib-1', userId });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    genreRepository = createMock<GenreRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryGenreHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreRepository, useValue: genreRepository },
      ],
    }).compile();

    handler = module.get(GetLibraryGenreHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return parsed genre', async () => {
    const query = new GetLibraryGenreQuery(userId, 'g1');
    libraryRepository.getByUserId.mockResolvedValue(library);
    genreRepository.getGenreForLibrary.mockResolvedValue(mockGenre as any);

    const result = await handler.execute(query);

    expect(result.id).toBe('g1');
    expect(genreRepository.getGenreForLibrary).toHaveBeenCalledWith('g1', library.id);
  });

  it('should throw PreconditionFailedException when no library', async () => {
    const query = new GetLibraryGenreQuery(userId, 'g1');
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw NotFoundException when genre missing', async () => {
    const query = new GetLibraryGenreQuery(userId, 'g1');
    libraryRepository.getByUserId.mockResolvedValue(library);
    genreRepository.getGenreForLibrary.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException when GenreSchema fails', async () => {
    const query = new GetLibraryGenreQuery(userId, 'g1');
    libraryRepository.getByUserId.mockResolvedValue(library);
    genreRepository.getGenreForLibrary.mockResolvedValue({ bad: true } as any);
    const safeParseSpy = vi.spyOn(GenreSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => '' },
    } as any);

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
    safeParseSpy.mockRestore();
  });
});
