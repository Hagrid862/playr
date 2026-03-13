import { LibraryRepository } from '@/shared/repositories/library.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildLibrary } from '@repo/testing';
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

  it('should return library if it exists', async () => {
    const userId = 'user-123';
    const query = new GetLibraryQuery(userId);
    const mockLibrary = buildLibrary({ id: 'lib-123', userId });

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);

    const result = await handler.execute(query);

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(result).toBe(mockLibrary);
  });

  it('should throw NotFoundException if library does not exist', async () => {
    const userId = 'user-123';
    const query = new GetLibraryQuery(userId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow('Library not found');
  });
});
