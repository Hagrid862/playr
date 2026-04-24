import { LibraryRepository } from '@/shared/repositories/library.repository';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a library if it does not exist', async () => {
    const userId = 'user-123';
    const command = new CreateLibraryCommand(userId);
    const mockLibrary = libraryBuilder({ id: 'lib-123', userId });

    libraryRepository.findOne.mockResolvedValue(null);
    libraryRepository.create.mockResolvedValue(mockLibrary);

    const result = await handler.execute(command);

    expect(libraryRepository.findOne).toHaveBeenCalledWith({ userId });
    expect(libraryRepository.create).toHaveBeenCalledWith({
      user: { connect: { id: userId } },
    });
    expect(result).toBe(mockLibrary);
  });

  it('should throw ConflictException if library already exists', async () => {
    const userId = 'user-123';
    const command = new CreateLibraryCommand(userId);
    const existingLibrary = {
      ...libraryBuilder({ id: 'lib-123', userId }),
      user: userBuilder({ id: userId }),
    } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;

    libraryRepository.findOne.mockResolvedValue(existingLibrary);

    const result = handler.execute(command);
    await expect(result).rejects.toThrow(ConflictException);
    await expect(result).rejects.toThrow('Library already exists');
    expect(libraryRepository.create).not.toHaveBeenCalled();
  });
});
