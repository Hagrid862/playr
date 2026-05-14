import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeletedGenreSchema } from '@repo/contracts';
import { GenreKind } from '@repo/db';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryGenreCommand } from '../impl/delete-library-genre.command';
import { DeleteLibraryGenreHandler } from './delete-library-genre.handler';

describe('DeleteLibraryGenreHandler', () => {
  let handler: DeleteLibraryGenreHandler;
  let genreRepository: DeepMocked<GenreRepository>;
  let genreResolution: DeepMocked<GenreResolutionService>;

  beforeEach(async () => {
    genreRepository = createMock<GenreRepository>();
    genreResolution = createMock<GenreResolutionService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryGenreHandler,
        { provide: GenreRepository, useValue: genreRepository },
        { provide: GenreResolutionService, useValue: genreResolution },
      ],
    }).compile();

    handler = module.get(DeleteLibraryGenreHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should soft-delete and return deleted id', async () => {
    const command = new DeleteLibraryGenreCommand('genre-1', 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockResolvedValue({
      id: 'genre-1',
      kind: GenreKind.custom,
      libraryId: 'lib-1',
    } as any);
    genreRepository.softDelete.mockResolvedValue({
      id: 'genre-1',
      name: 'G',
      slug: 'g',
      deletedAt: new Date(),
    } as any);

    const result = await handler.execute(command);

    expect(result).toEqual({ id: 'genre-1' });
    expect(genreRepository.softDelete).toHaveBeenCalledWith('genre-1');
  });

  it('should propagate PreconditionFailedException from assert', async () => {
    const command = new DeleteLibraryGenreCommand('genre-1', 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockRejectedValue(
      new PreconditionFailedException('no library'),
    );

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should propagate NotFoundException from assert', async () => {
    const command = new DeleteLibraryGenreCommand('genre-1', 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockRejectedValue(new NotFoundException());

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should propagate ForbiddenException from assert', async () => {
    const command = new DeleteLibraryGenreCommand('genre-1', 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockRejectedValue(new ForbiddenException());

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
  });

  it('should throw InternalServerErrorException when DeletedGenreSchema parse fails', async () => {
    const command = new DeleteLibraryGenreCommand('genre-1', 'user-1');
    genreResolution.assertEditableCustomGenreForUser.mockResolvedValue({} as any);
    genreRepository.softDelete.mockResolvedValue({ id: 'genre-1' } as any);
    const safeParseSpy = vi.spyOn(DeletedGenreSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => '' },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
    safeParseSpy.mockRestore();
  });
});
