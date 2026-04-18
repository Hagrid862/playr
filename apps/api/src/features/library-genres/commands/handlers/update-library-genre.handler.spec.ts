import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GenreSchema } from '@repo/contracts';
import { GenreKind } from '@repo/db';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryGenreCommand } from '../impl/update-library-genre.command';
import { UpdateLibraryGenreHandler } from './update-library-genre.handler';

const existing = {
  id: 'genre-1',
  name: 'Old',
  slug: 'old',
  description: null,
  kind: GenreKind.custom,
  libraryId: 'library-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
};

const updatedRow = {
  ...existing,
  name: 'New Name',
  slug: 'newname',
};

describe('UpdateLibraryGenreHandler', () => {
  let handler: UpdateLibraryGenreHandler;
  let genreRepository: DeepMocked<GenreRepository>;
  let genreResolution: DeepMocked<GenreResolutionService>;

  beforeEach(async () => {
    genreRepository = createMock<GenreRepository>();
    genreResolution = createMock<GenreResolutionService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryGenreHandler,
        { provide: GenreRepository, useValue: genreRepository },
        { provide: GenreResolutionService, useValue: genreResolution },
      ],
    }).compile();

    handler = module.get(UpdateLibraryGenreHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update name and slug', async () => {
    const command = new UpdateLibraryGenreCommand('genre-1', { name: 'New Name' }, 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockResolvedValue(existing as any);
    genreResolution.allocateUniqueSlugForLibraryRename.mockResolvedValue('newname');
    genreRepository.update.mockResolvedValue(updatedRow as any);

    const result = await handler.execute(command);

    expect(result.name).toBe('New Name');
    expect(genreRepository.update).toHaveBeenCalledWith('genre-1', {
      name: 'New Name',
      slug: 'newname',
    });
  });

  it('should throw InternalServerErrorException when parse fails', async () => {
    const command = new UpdateLibraryGenreCommand('genre-1', { name: 'New Name' }, 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockResolvedValue(existing as any);
    genreResolution.allocateUniqueSlugForLibraryRename.mockResolvedValue('newname');
    genreRepository.update.mockResolvedValue({ bad: true } as any);
    const safeParseSpy = vi.spyOn(GenreSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => '' },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
    safeParseSpy.mockRestore();
  });
});
