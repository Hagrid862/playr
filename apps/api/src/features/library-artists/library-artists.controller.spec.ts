import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateArtistCommand } from './commands/impl/create-artist.command';
import { DeleteArtistCommand } from './commands/impl/delete-artist.command';
import { UpdateArtistCommand } from './commands/impl/update-artist.command';
import { LibraryArtistsController } from './library-artists.controller';
import { GetLibraryArtistQuery } from './queries/impl/get-library-artist.query';
import { GetLibraryArtistsQuery } from './queries/impl/get-library-artists.query';

describe('LibraryArtistsController', () => {
  let controller: LibraryArtistsController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryArtistsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<LibraryArtistsController>(LibraryArtistsController);
  });

  describe('createArtist', () => {
    it('should execute CreateArtistCommand with correct parameters', async () => {
      const userId = 'user-123';
      const request = { name: 'New Artist' };
      const expectedResult = { id: 'artist-123', ...request };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.createArtist(request as any, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateArtistCommand(request as any, userId),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('getLibraryArtists', () => {
    it('should execute GetLibraryArtistsQuery with correct parameters', async () => {
      const userId = 'user-123';
      const query = { page: 1, limit: 10 };
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getLibraryArtists(userId, query as any);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetLibraryArtistsQuery(userId, query.page, query.limit),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('getLibraryArtist', () => {
    it('should execute GetLibraryArtistQuery with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const expectedResult = { id: artistId, name: 'Test Artist' };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getLibraryArtist(userId, artistId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryArtistQuery(userId, artistId));
      expect(result).toBe(expectedResult);
    });
  });

  describe('updateArtist', () => {
    it('should execute UpdateArtistCommand with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      const request = { name: 'Updated Artist' };
      const expectedResult = { id: artistId, ...request };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.updateArtist(artistId, request as any, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateArtistCommand(artistId, request as any, userId),
      );
      expect(result).toBe(expectedResult);
    });
  });

  describe('deleteArtist', () => {
    it('should execute DeleteArtistCommand with correct parameters', async () => {
      const userId = 'user-123';
      const artistId = 'artist-123';
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deleteArtist(artistId, userId);

      expect(commandBus.execute).toHaveBeenCalledWith(new DeleteArtistCommand(artistId, userId));
    });
  });
});
