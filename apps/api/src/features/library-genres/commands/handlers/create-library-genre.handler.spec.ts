import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { InternalServerErrorException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GenreSchema } from '@repo/contracts';
import { GenreKind } from '@repo/db';
import { libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryGenreCommand } from '../impl/create-library-genre.command';
import { CreateLibraryGenreHandler } from './create-library-genre.handler';

const validGenreRow: Awaited<ReturnType<GenreResolutionService['ensureCustomGenre']>> = {
  id: 'genre-1',
  name: 'My Genre',
  slug: 'mygenre',
  description: null,
  kind: GenreKind.custom,
  libraryId: 'library-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('CreateLibraryGenreHandler', () => {
  let handler: CreateLibraryGenreHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreResolution: DeepMocked<GenreResolutionService>;

  const userId = 'user-1';
  const mockLibrary = {
    ...libraryBuilder({ id: 'library-1', userId }),
    user: userBuilder({ id: userId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    genreResolution = createMock<GenreResolutionService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryGenreHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreResolutionService, useValue: genreResolution },
      ],
    }).compile();

    handler = module.get(CreateLibraryGenreHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a custom genre', async () => {
    const command = new CreateLibraryGenreCommand({ name: 'My Genre' }, userId);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolution.ensureCustomGenre.mockResolvedValue(validGenreRow);

    const result = await handler.execute(command);

    expect(result).toMatchObject({ id: 'genre-1', name: 'My Genre' });
    expect(genreResolution.ensureCustomGenre).toHaveBeenCalledWith(mockLibrary.id, 'My Genre');
  });

  it('should throw PreconditionFailedException when library is missing', async () => {
    const command = new CreateLibraryGenreCommand({ name: 'X' }, userId);
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(genreResolution.ensureCustomGenre).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException when GenreSchema validation fails', async () => {
    const command = new CreateLibraryGenreCommand({ name: 'Bad' }, userId);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolution.ensureCustomGenre.mockResolvedValue({ invalid: true } as any);
    const safeParseSpy = vi.spyOn(GenreSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => '' },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
    safeParseSpy.mockRestore();
  });
});
