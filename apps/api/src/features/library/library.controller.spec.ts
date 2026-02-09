import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateLibraryCommand } from './commands/impl/create-library.command';
import { GetLibraryCommand } from './commands/impl/get-library.command';
import { LibraryController } from './library.controller';

describe('LibraryController', () => {
  let controller: LibraryController;
  let commandBus: DeepMocked<CommandBus>;

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
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

  describe('getAll', () => {
    it('should execute GetLibraryCommand with user id', async () => {
      const userId = 'user-123';
      const expectedResult = { id: 'lib-123', userId };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getAll(userId);

      expect(commandBus.execute).toHaveBeenCalledWith(new GetLibraryCommand(userId));
      expect(result).toBe(expectedResult);
    });
  });
});
