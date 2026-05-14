import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { GenreKind } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryGenreCommand } from './commands/impl/create-library-genre.command';
import { DeleteLibraryGenreCommand } from './commands/impl/delete-library-genre.command';
import { UpdateLibraryGenreCommand } from './commands/impl/update-library-genre.command';
import { LibraryGenresController } from './library-genres.controller';
import { GetLibraryGenreQuery } from './queries/impl/get-library-genre.query';
import { GetLibraryGenresQuery } from './queries/impl/get-library-genres.query';

describe('LibraryGenresController', () => {
  let controller: LibraryGenresController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  const userId = 'user-1';
  const genreId = 'genre-1';

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryGenresController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: Reflector, useValue: createMock<Reflector>() },
      ],
    }).compile();

    controller = module.get(LibraryGenresController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('getGenres should execute GetLibraryGenresQuery and return result', async () => {
    const queryDto = { page: 2, limit: 10, query: 'rock', kind: GenreKind.custom } as any;
    const expected = { items: [], total: 0, page: 2, limit: 10 };
    queryBus.execute.mockResolvedValue(expected);

    const result = await controller.getGenres(userId, queryDto);

    expect(result).toBe(expected);
    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetLibraryGenresQuery(userId, 2, 10, 'rock', GenreKind.custom),
    );
  });

  it('getGenre should execute GetLibraryGenreQuery', async () => {
    const expected = { id: genreId };
    queryBus.execute.mockResolvedValue(expected);

    const result = await controller.getGenre(userId, genreId);

    expect(result).toBe(expected);
    expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryGenreQuery(userId, genreId));
  });

  it('createGenre should execute CreateLibraryGenreCommand', async () => {
    const body = { name: 'Custom' } as any;
    const expected = { id: genreId, name: 'Custom' };
    commandBus.execute.mockResolvedValue(expected);

    const result = await controller.createGenre(body, userId);

    expect(result).toBe(expected);
    expect(commandBus.execute).toHaveBeenCalledWith(new CreateLibraryGenreCommand(body, userId));
  });

  it('updateGenre should execute UpdateLibraryGenreCommand', async () => {
    const body = { name: 'Renamed' } as any;
    const expected = { id: genreId, name: 'Renamed' };
    commandBus.execute.mockResolvedValue(expected);

    const result = await controller.updateGenre(genreId, body, userId);

    expect(result).toBe(expected);
    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateLibraryGenreCommand(genreId, body, userId),
    );
  });

  it('deleteGenre should execute DeleteLibraryGenreCommand', async () => {
    const expected = { id: genreId };
    commandBus.execute.mockResolvedValue(expected);

    const result = await controller.deleteGenre(genreId, userId);

    expect(result).toBe(expected);
    expect(commandBus.execute).toHaveBeenCalledWith(new DeleteLibraryGenreCommand(genreId, userId));
  });
});
