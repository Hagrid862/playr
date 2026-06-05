import { Env } from '@/common/config/env.schema';
import { estimateReservedProcessedBytes } from '@/features/audio-processing/audio-processing.constants';
import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type StorageQuotaLimitSource = 'default' | 'override';

export type LibraryStorageUsage = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  usedPercent: number;
  limitSource: StorageQuotaLimitSource;
};

export type StorageQuotaExceededDetails = {
  message: string;
  usedBytes: number;
  limitBytes: number;
};

/** Upper bound for quota values used in JS number arithmetic (2^53 - 1). */
const MAX_SAFE_STORAGE_QUOTA_BYTES = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Converts `User.storageQuotaBytes` (PostgreSQL BIGINT) to a JS number for quota checks.
 * Values outside [0, Number.MAX_SAFE_INTEGER] are not representable safely and are ignored
 * so callers fall back to `LIBRARY_STORAGE_QUOTA_BYTES`.
 */
function resolveStorageQuotaOverrideBytes(override: bigint): number | null {
  if (override < 0n || override > MAX_SAFE_STORAGE_QUOTA_BYTES) {
    return null;
  }
  return Number(override);
}

@Injectable()
export class LibraryStorageQuotaService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly audioFileRepository: AudioFileRepository,
    private readonly userRepository: UserRepository,
  ) {}

  getDefaultLimitBytes(): number {
    return this.config.get('LIBRARY_STORAGE_QUOTA_BYTES', { infer: true });
  }

  async getLimitBytes(userId: string): Promise<number> {
    const override = await this.userRepository.getStorageQuotaBytes(userId);
    if (override != null) {
      const resolved = resolveStorageQuotaOverrideBytes(override);
      if (resolved != null) {
        return resolved;
      }
    }
    return this.getDefaultLimitBytes();
  }

  async getLimitSource(userId: string): Promise<StorageQuotaLimitSource> {
    const override = await this.userRepository.getStorageQuotaBytes(userId);
    if (override != null && resolveStorageQuotaOverrideBytes(override) != null) {
      return 'override';
    }
    return 'default';
  }

  async getUsageBytes(ownerUserId: string): Promise<number> {
    return this.audioFileRepository.sumCountableBytesByOwnerUserId(ownerUserId);
  }

  async getUsage(ownerUserId: string): Promise<LibraryStorageUsage> {
    const [usedBytes, limitBytes, limitSource] = await Promise.all([
      this.getUsageBytes(ownerUserId),
      this.getLimitBytes(ownerUserId),
      this.getLimitSource(ownerUserId),
    ]);
    const remainingBytes = Math.max(0, limitBytes - usedBytes);
    const usedPercent =
      limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

    return {
      usedBytes,
      limitBytes,
      remainingBytes,
      usedPercent,
      limitSource,
    };
  }

  async assertCanAddBytes(ownerUserId: string, additionalBytes: number): Promise<void> {
    if (additionalBytes <= 0) {
      return;
    }

    const [usedBytes, limitBytes] = await Promise.all([
      this.getUsageBytes(ownerUserId),
      this.getLimitBytes(ownerUserId),
    ]);

    if (usedBytes + additionalBytes > limitBytes) {
      throw new PayloadTooLargeException({
        message: 'Storage quota exceeded',
        usedBytes,
        limitBytes,
      } satisfies StorageQuotaExceededDetails);
    }
  }

  estimateReservedProcessedBytes(originalSize: number, isLossless: boolean): number {
    return estimateReservedProcessedBytes(originalSize, isLossless);
  }
}
