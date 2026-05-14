import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateLibraryCommand } from './commands/impl/create-library.command';
import { LibraryController } from './library.controller';
import { GetLibraryQuery } from './queries/impl/get-library.query';

describe('LibraryController', () => {
  let controller: LibraryController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<LibraryController>(LibraryController);
  });

  describe('create', () => {
    it('should execute CreateLibraryCommand with user id', async () => {
      const userId = 'user-123';
      const expectedResult = { id: 'lib-123', userId };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.create(userId);

      expect(commandBus.execute).toHaveBeenCalledWith(new CreateLibraryCommand(userId));
      expect(result).toBe(expectedResult);
    });
  });

  describe('getLibrary', () => {
    it('should execute GetLibraryQuery with user id', async () => {
      const userId = 'user-123';
      const expectedResult = { id: 'lib-123', userId };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getLibrary(userId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetLibraryQuery(userId));
      expect(result).toBe(expectedResult);
    });
  });
});
