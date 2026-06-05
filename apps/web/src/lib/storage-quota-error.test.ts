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

  it('uses ApiError message when quota payload is missing', () => {
    const error = new ApiError(413, 'Payload Too Large', null);

    expect(getStorageQuotaExceededDetails(error)).toEqual({
      message: 'Payload Too Large',
    });
  });

  it('uses a string error message from the failure payload', () => {
    const error = new ApiError(413, 'Payload Too Large', {
      error: { message: 'Library is full' },
    });

    expect(getStorageQuotaExceededDetails(error)).toEqual({
      message: 'Library is full',
    });
    expect(getStorageQuotaErrorToastMessage(error)).toBe('Library is full');
  });

  it('falls back to ApiError message when failure message shape is unexpected', () => {
    const error = new ApiError(413, 'Payload Too Large', {
      error: {},
    });

    expect(getStorageQuotaExceededDetails(error)).toEqual({
      message: 'Payload Too Large',
    });
  });

  it('uses the default message when structured details omit a string message', () => {
    const error = new ApiError(413, 'Payload Too Large', {
      error: {
        message: {
          usedBytes: 1_000,
          limitBytes: 2_000,
          message: 123,
        },
      },
    });

    expect(getStorageQuotaExceededDetails(error)).toEqual({
      message: 'Storage quota exceeded',
      usedBytes: 1_000,
      limitBytes: 2_000,
    });
  });

  it('returns quota details message without byte counts in the toast', () => {
    const error = new ApiError(413, 'Payload Too Large', {
      error: {
        message: {
          message: 'Storage quota exceeded',
        },
      },
    });

    expect(getStorageQuotaExceededDetails(error)).toEqual({
      message: 'Storage quota exceeded',
      usedBytes: undefined,
      limitBytes: undefined,
    });
    expect(getStorageQuotaErrorToastMessage(error)).toBe('Storage quota exceeded');
  });

  it('uses the default quota message when details message is empty', () => {
    const error = new ApiError(413, 'Payload Too Large', {
      error: {
        message: {
          message: '',
        },
      },
    });

    expect(getStorageQuotaErrorToastMessage(error)).toBe('Storage quota exceeded');
  });

  it('uses the fallback message for unknown non-error values', () => {
    expect(getStorageQuotaErrorToastMessage('offline', 'Upload failed')).toBe('Upload failed');
  });
});
