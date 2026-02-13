import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreatePrivateProfileCommand } from './commands/impl/create-private-profile.command';
import { PrivateProfileController } from './private-profile.controller';
import { GetPrivateProfileQuery } from './queries/impl/get-private-profile.query';

describe('PrivateProfileController', () => {
  let controller: PrivateProfileController;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivateProfileController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<PrivateProfileController>(PrivateProfileController);
  });

  describe('getPrivateProfile', () => {
    it('should execute GetPrivateProfileQuery with user id', async () => {
      const userId = 'user-123';
      const expectedResult = { id: 'pp-123', userId };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getPrivateProfile(userId);

      expect(queryBus.execute).toHaveBeenCalledWith(new GetPrivateProfileQuery(userId));
      expect(result).toBe(expectedResult);
    });
  });

  describe('createPrivateProfile', () => {
    it('should execute CreatePrivateProfileCommand with user id', async () => {
      const userId = 'user-123';
      const expectedResult = { id: 'pp-123', userId };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.createPrivateProfile(userId);

      expect(commandBus.execute).toHaveBeenCalledWith(new CreatePrivateProfileCommand(userId));
      expect(result).toBe(expectedResult);
    });
  });
});
