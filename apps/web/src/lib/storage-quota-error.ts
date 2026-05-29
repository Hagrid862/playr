import { ApiError } from '@/lib/api-error';
import { formatBytes } from '@/lib/format-bytes';

export type StorageQuotaExceededDetails = {
  message: string;
  usedBytes?: number;
  limitBytes?: number;
};

export function isStorageQuotaExceededError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 413;
}

export function getStorageQuotaExceededDetails(error: unknown): StorageQuotaExceededDetails | null {
  if (!isStorageQuotaExceededError(error)) {
    return null;
  }

  const payload = error.data;
  if (!payload || typeof payload !== 'object') {
    return { message: error.message };
  }

  const failure = payload as {
    error?: { message?: unknown };
  };

  const rawMessage = failure.error?.message;
  if (typeof rawMessage === 'string') {
    return { message: rawMessage };
  }

  if (rawMessage && typeof rawMessage === 'object') {
    const details = rawMessage as Record<string, unknown>;
    const usedBytes = typeof details.usedBytes === 'number' ? details.usedBytes : undefined;
    const limitBytes = typeof details.limitBytes === 'number' ? details.limitBytes : undefined;
    const message =
      typeof details.message === 'string' ? details.message : 'Storage quota exceeded';

    return { message, usedBytes, limitBytes };
  }

  return { message: error.message };
}

export function getStorageQuotaErrorToastMessage(
  error: unknown,
  fallbackMessage = 'Upload failed',
): string {
  const details = getStorageQuotaExceededDetails(error);
  if (!details) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  if (details.usedBytes != null && details.limitBytes != null) {
    return `Storage full: ${formatBytes(details.usedBytes)} of ${formatBytes(details.limitBytes)} used. Free up space or contact support for a higher limit.`;
  }

  return details.message || 'Storage quota exceeded';
}
