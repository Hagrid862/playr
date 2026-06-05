import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryStorageQuotaService } from '@/shared/services/library-storage-quota.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { GetLibraryStorageUsageQuery } from '../impl/get-library-storage-usage.query';
import { GetLibraryStorageUsageHandler } from './get-library-storage-usage.handler';

describe('GetLibraryStorageUsageHandler', () => {
  let handler: GetLibraryStorageUsageHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let storageQuotaService: DeepMocked<LibraryStorageQuotaService>;

  const userId = 'user-123';

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    storageQuotaService = createMock<LibraryStorageQuotaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryStorageUsageHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryStorageQuotaService, useValue: storageQuotaService },
      ],
    }).compile();

    handler = module.get(GetLibraryStorageUsageHandler);
  });

  it('throws NotFoundException when library does not exist', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(new GetLibraryStorageUsageQuery(userId))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns storage usage for the user', async () => {
    libraryRepository.getByUserId.mockResolvedValue(libraryBuilder({ userId }));
    const usage = {
      usedBytes: 1_000,
      limitBytes: 10_000,
      remainingBytes: 9_000,
      usedPercent: 10,
      limitSource: 'default' as const,
    };
    storageQuotaService.getUsage.mockResolvedValue(usage);

    const result = await handler.execute(new GetLibraryStorageUsageQuery(userId));

    expect(storageQuotaService.getUsage).toHaveBeenCalledWith(userId);
    expect(result).toEqual(usage);
  });
});
