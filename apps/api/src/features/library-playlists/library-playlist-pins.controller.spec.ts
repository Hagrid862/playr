import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PinPlaylistCommand } from './commands/impl/pin-playlist.command';
import { ReorderPlaylistPinsCommand } from './commands/impl/reorder-playlist-pins.command';
import { UnpinPlaylistCommand } from './commands/impl/unpin-playlist.command';
import { LibraryPlaylistPinsController } from './library-playlist-pins.controller';
import { GetLibraryPlaylistPinsQuery } from './queries/impl/get-library-playlist-pins.query';

describe('LibraryPlaylistPinsController', () => {
  let controller: LibraryPlaylistPinsController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  const mockUserId = 'user-123';

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryPlaylistPinsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<LibraryPlaylistPinsController>(LibraryPlaylistPinsController);
  });

  describe('list', () => {
    it('should execute GetLibraryPlaylistPinsQuery and return the result', async () => {
      const mockResult = [{ id: 'pin-123', order: 0, playlist: { id: 'pl-1' } }] as any;
      queryBus.execute.mockResolvedValue(mockResult);

      const result = await controller.list(mockUserId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryPlaylistPinsQuery(mockUserId));
      expect(result).toBe(mockResult);
    });
  });

  describe('pin', () => {
    it('should execute PinPlaylistCommand and return the result', async () => {
      const body = { playlistId: 'playlist-123' };
      const mockResult = { id: 'pin-123', order: 1 } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.pin(mockUserId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(new PinPlaylistCommand(body, mockUserId));
      expect(result).toBe(mockResult);
    });
  });

  describe('reorder', () => {
    it('should execute ReorderPlaylistPinsCommand and return the result', async () => {
      const body = { orderedIds: ['pin-2', 'pin-1'] };
      const mockResult = [{ id: 'pin-2', order: 0 }] as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.reorder(mockUserId, body);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new ReorderPlaylistPinsCommand(body, mockUserId),
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('unpin', () => {
    it('should execute UnpinPlaylistCommand and return the result', async () => {
      const pinId = 'pin-123';
      const mockResult = { id: pinId } as any;
      commandBus.execute.mockResolvedValue(mockResult);

      const result = await controller.unpin(mockUserId, pinId);

      expect(commandBus.execute).toHaveBeenCalledWith(new UnpinPlaylistCommand(pinId, mockUserId));
      expect(result).toBe(mockResult);
    });
  });
});
