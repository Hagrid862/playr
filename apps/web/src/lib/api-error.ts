import { ApiFailureResponseSchema } from '@repo/contracts';
import { z } from 'zod';

export type ApiFailureResponse = z.infer<typeof ApiFailureResponseSchema>;

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string | undefined,
    public data: unknown,
  ) {
    let message = statusText || 'Unknown API Error';

    if (data && typeof data === 'object') {
      // Check for standard ApiFailureResponse structure safely
      const failure = data as { error?: { message?: unknown } };
      if (failure.error?.message) {
        const rawMessage = failure.error.message;
        message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
      } else if ('message' in data) {
        // Handle generic fallback (e.g. simple JSON error)
        const fallback = data as { message?: unknown };
        if (typeof fallback.message === 'string') {
          message = fallback.message;
        }
      }
    }

    super(message);
    this.name = 'ApiError';
  }
}
