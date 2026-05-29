import { ApiError } from '@/lib/api-error';
import { describe, expect, it } from 'vitest';
import {
  getStorageQuotaErrorToastMessage,
  getStorageQuotaExceededDetails,
  isStorageQuotaExceededError,
} from './storage-quota-error';

describe('storage-quota-error', () => {
  it('detects 413 ApiError', () => {
    const error = new ApiError(413, 'Payload Too Large', {
      error: {
        statusCode: 413,
        message: {
          message: 'Storage quota exceeded',
          usedBytes: 6_000_000_000,
          limitBytes: 5_368_709_120,
        },
      },
    });

    expect(isStorageQuotaExceededError(error)).toBe(true);
    expect(getStorageQuotaExceededDetails(error)).toMatchObject({
      usedBytes: 6_000_000_000,
      limitBytes: 5_368_709_120,
    });
    expect(getStorageQuotaErrorToastMessage(error)).toContain('Storage full');
    expect(getStorageQuotaErrorToastMessage(error)).toContain('GB');
  });

  it('falls back for non-quota errors', () => {
    const error = new Error('network');
    expect(isStorageQuotaExceededError(error)).toBe(false);
    expect(getStorageQuotaErrorToastMessage(error)).toBe('network');
  });
});
