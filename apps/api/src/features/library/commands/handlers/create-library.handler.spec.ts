import { LibraryRepository } from '@/shared/repositories/library.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateLibraryCommand } from '../impl/create-library.command';
import { CreateLibraryHandler } from './create-library.handler';

describe('CreateLibraryHandler', () => {
  let handler: CreateLibraryHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
      ],
    }).compile();

    handler = module.get<CreateLibraryHandler>(CreateLibraryHandler);
  });

  it('should create a library if it does not exist', async () => {
    const userId = 'user-123';
    const command = new CreateLibraryCommand(userId);
    const mockLibrary = { id: 'lib-123', userId } as any;

    libraryRepository.getByUserId.mockResolvedValue(null);
    libraryRepository.create.mockResolvedValue(mockLibrary);

    const result = await handler.execute(command);

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryRepository.create).toHaveBeenCalledWith({
      user: { connect: { id: userId } },
    });
    expect(result).toBe(mockLibrary);
  });

  it('should throw ConflictException if library already exists', async () => {
    const userId = 'user-123';
    const command = new CreateLibraryCommand(userId);
    const existingLibrary = { id: 'lib-123', userId } as any;

    libraryRepository.getByUserId.mockResolvedValue(existingLibrary);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    await expect(handler.execute(command)).rejects.toThrow('Library already exists');
    expect(libraryRepository.create).not.toHaveBeenCalled();
  });
});
