import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetListenHistoryRequestDto } from './dto/get-listen-history.request.dto';
import { ListenHistoryController } from './listen-history.controller';
import { GetListenHistoryQuery } from './queries/impl/get-listen-history.query';
import { ClearListenHistoryCommand } from './commands/impl/clear-listen-history.command';

describe('ListenHistoryController', () => {
  let controller: ListenHistoryController;
  let commandBus: { execute: ReturnType<typeof vi.fn> };
  let queryBus: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    commandBus = { execute: vi.fn() };
    queryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListenHistoryController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<ListenHistoryController>(ListenHistoryController);
  });

  describe('getHistory', () => {
    it('should execute GetListenHistoryQuery with query parameters', async () => {
      const userId = 'user-123';
      const queryDto: GetListenHistoryRequestDto = { page: 2, limit: 15 };
      const expectedResult = { items: [], total: 0, page: 2, limit: 15 };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getHistory(userId, queryDto);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetListenHistoryQuery(userId, 2, 15));
      expect(result).toBe(expectedResult);
    });
  });

  describe('clearHistory', () => {
    it('should execute ClearListenHistoryCommand', async () => {
      const userId = 'user-123';
      const expectedResult = { success: true };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.clearHistory(userId);

      expect(commandBus.execute).toHaveBeenCalledWith(new ClearListenHistoryCommand(userId));
      expect(result).toBe(expectedResult);
    });
  });
});
