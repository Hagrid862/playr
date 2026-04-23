import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryQuery } from '../impl/get-library.query';
import { GetLibraryHandler } from './get-library.handler';

describe('GetLibraryHandler', () => {
  let handler: GetLibraryHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetLibraryHandler, { provide: LibraryRepository, useValue: libraryRepository }],
    }).compile();

    handler = module.get<GetLibraryHandler>(GetLibraryHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return library if it exists', async () => {
    const userId = 'user-123';
    const query = new GetLibraryQuery(userId);
    const mockLibrary = {
      ...libraryBuilder({ id: 'lib-123', userId }),
      user: userBuilder({ id: userId }),
    } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;

    libraryRepository.findOne.mockResolvedValue(mockLibrary);

    const result = await handler.execute(query);

    expect(libraryRepository.findOne).toHaveBeenCalledWith({ userId });
    expect(result).toBe(mockLibrary);
  });

  it('should throw NotFoundException if library does not exist', async () => {
    const userId = 'user-123';
    const query = new GetLibraryQuery(userId);

    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow('Library not found');
  });
});
