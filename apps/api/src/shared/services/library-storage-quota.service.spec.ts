import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LibraryStorageQuotaService } from './library-storage-quota.service';

describe('LibraryStorageQuotaService', () => {
  let service: LibraryStorageQuotaService;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let userRepository: DeepMocked<UserRepository>;
  let configService: DeepMocked<ConfigService>;

  beforeEach(async () => {
    audioFileRepository = createMock<AudioFileRepository>();
    userRepository = createMock<UserRepository>();
    configService = createMock<ConfigService>();

    configService.get.mockImplementation((key: string) => {
      if (key === 'LIBRARY_STORAGE_QUOTA_BYTES') {
        return 10_000;
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryStorageQuotaService,
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(LibraryStorageQuotaService);
  });

  it('uses env default when user has no override', async () => {
    userRepository.getStorageQuotaBytes.mockResolvedValue(null);
    audioFileRepository.sumCountableBytesByOwnerUserId.mockResolvedValue(100);

    const usage = await service.getUsage('user-1');

    expect(usage.limitBytes).toBe(10_000);
    expect(usage.limitSource).toBe('default');
    expect(usage.usedBytes).toBe(100);
    expect(usage.remainingBytes).toBe(9_900);
    expect(usage.usedPercent).toBe(1);
  });

  it('uses per-user override when set', async () => {
    userRepository.getStorageQuotaBytes.mockResolvedValue(BigInt(5_000));
    audioFileRepository.sumCountableBytesByOwnerUserId.mockResolvedValue(4_000);

    const usage = await service.getUsage('user-1');

    expect(usage.limitBytes).toBe(5_000);
    expect(usage.limitSource).toBe('override');
    expect(usage.remainingBytes).toBe(1_000);
    expect(usage.usedPercent).toBe(80);
  });

  it('throws PayloadTooLargeException when quota would be exceeded', async () => {
    userRepository.getStorageQuotaBytes.mockResolvedValue(null);
    audioFileRepository.sumCountableBytesByOwnerUserId.mockResolvedValue(9_500);

    await expect(service.assertCanAddBytes('user-1', 600)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });
});
