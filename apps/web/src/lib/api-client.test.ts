import { useAuthStore } from '@/stores/auth.store';
import type { ZodUser } from '@repo/contracts';
import { userBuilder } from '@repo/testing/builders';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, apiClient } from './api-client';
import { ApiError } from './api-error';

vi.mock('@/stores/idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn().mockRejectedValue(new Error('rehydration failed')),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockUser = (() => {
  const { password, ...user } = userBuilder({ id: 'user-1', username: 'testuser' });
  void password;
  return user as ZodUser;
})();

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(
  body: unknown,
  init: Partial<Pick<Response, 'ok' | 'status' | 'statusText'>> & {
    json?: () => Promise<unknown>;
  } = {},
): Response {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  const statusText = init.statusText ?? '';
  return {
    ok,
    status,
    statusText,
    json: init.json ?? (async () => body),
  } as Response;
}

function getHeader(headers: HeadersInit | undefined, name: string): string | undefined {
  if (headers === undefined) return undefined;
  const key = name.toLowerCase();

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const value = headers.get(name);
    return value === null ? undefined : value;
  }

  if (Array.isArray(headers)) {
    for (const pair of headers) {
      if (!pair || pair.length < 2) continue;
      const [headerName, headerValue] = pair;
      if (typeof headerName === 'string' && headerName.toLowerCase() === key) {
        return String(headerValue);
      }
    }
    return undefined;
  }

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === key) {
      return headerValue === undefined ? undefined : String(headerValue);
    }
  }
  return undefined;
}

describe('api-client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    useAuthStore.getState().logout();
  });

  describe('HTTP requests', () => {
    it('performs a GET request correctly', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockResponse));

      const result = await api.request('test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('performs a POST request when body is provided', async () => {
      const mockResponse = { success: true };
      const body = { name: 'test' };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockResponse, { status: 201 }));

      const result = await api.request('create', { body });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('apiClient wrapper works as expected', async () => {
      const mockResponse = { data: 'wrapper' };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockResponse));

      const result = await apiClient('wrapper-test');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Zod validation', () => {
    it('validates response with Zod schema', async () => {
      const schema = z.object({ id: z.number() });
      const validResponse = { id: 123 };

      mockFetch.mockResolvedValueOnce(jsonResponse(validResponse));

      const result = await api.request('user', { zodSchema: schema });
      expect(result).toEqual(validResponse);
    });

    it('throws ZodError on validation failure', async () => {
      const schema = z.object({ id: z.number() });
      const invalidResponse = { id: 'not-a-number' };

      mockFetch.mockResolvedValueOnce(jsonResponse(invalidResponse));

      await expect(api.request('user', { zodSchema: schema })).rejects.toThrow();
    });
  });

  describe('error responses', () => {
    it('throws ApiError on non-2xx response', async () => {
      const errorResponse = { message: 'Not Found' };
      mockFetch.mockResolvedValue(
        jsonResponse(errorResponse, {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      );

      await expect(api.request('unknown')).rejects.toSatisfy((error) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toHaveProperty('message', 'Not Found');
        return true;
      });
    });

    it('handles empty 204 response', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, { status: 204 }));

      const result = await api.request('no-content');
      expect(result).toEqual({});
    });

    it('handles JSON parsing failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(null, {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => {
            throw new Error('JSON parse error');
          },
        }),
      );

      const request = api.request('bad-json');
      await expect(request).rejects.toThrow(ApiError);
      await expect(request).rejects.toMatchObject({ data: {} });
    });
  });

  describe('Authorization header', () => {
    it('adds Authorization header when token exists', async () => {
      useAuthStore.getState().setAuth(mockUser, 'valid-token');

      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

      await api.request('secure');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        }),
      );
    });
  });

  describe('refresh token flow', () => {
    it('handles 401 and refreshes token successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: 'Unauthorized' }, { ok: false, status: 401, statusText: '' }),
      );

      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { accessToken: 'new-token' } }, { status: 200 }),
      );

      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

      const result = await api.request('retried');

      expect(result).toEqual({ success: true });
      expect(useAuthStore.getState().accessToken).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/auth/refresh'),
        expect.anything(),
      );
    });

    it('logs out on failed refresh', async () => {
      const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      try {
        await expect(api.request('fail-refresh')).rejects.toThrow();
        expect(logoutSpy).toHaveBeenCalled();
      } finally {
        logoutSpy.mockRestore();
      }
    });

    it('logs out on refresh exception', async () => {
      const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));
      mockFetch.mockRejectedValueOnce(new Error('Network error during refresh'));

      try {
        await expect(api.request('refresh-error')).rejects.toThrow();
        expect(logoutSpy).toHaveBeenCalled();
      } finally {
        logoutSpy.mockRestore();
      }
    });
  });

  describe('concurrent refresh', () => {
    it('queues concurrent requests during refresh and retries them', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      mockFetch.mockResolvedValueOnce(
        jsonResponse({ data: { accessToken: 'shared-token' } }, { status: 200 }),
      );

      mockFetch.mockResolvedValue(jsonResponse({ success: true }));

      const [res1, res2] = await Promise.all([api.request('req1'), api.request('req2')]);

      expect(res1).toEqual({ success: true });
      expect(res2).toEqual({ success: true });
      expect(useAuthStore.getState().accessToken).toBe('shared-token');
    });

    it('rejects queued requests if refresh fails', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      mockFetch.mockResolvedValueOnce(
        jsonResponse({}, { ok: false, status: 500, statusText: 'Internal Server Error' }),
      );

      const [res1, res2] = await Promise.allSettled([api.request('req1'), api.request('req2')]);

      expect(res1.status).toBe('rejected');
      expect(res2.status).toBe('rejected');
    });

    it('handles refresh response with missing token in queued requests', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));
      mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401, statusText: '' }));

      mockFetch.mockResolvedValueOnce(jsonResponse({ data: {} }, { status: 200 }));

      const results = await Promise.allSettled([api.request('req1'), api.request('req2')]);

      expect(results[0].status).toBe('rejected');
      expect((results[0] as PromiseRejectedResult).reason.message).toBe(
        'Refresh token response missing access token',
      );
      expect(results[1].status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason.message).toBe(
        'Refresh token response missing access token',
      );
    });
  });

  describe('FormData', () => {
    it('handles FormData body correctly', async () => {
      const formData = new FormData();
      formData.append('file', 'test-content');

      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

      const result = await api.request('upload', { body: formData });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('upload'),
        expect.objectContaining({
          body: formData,
        }),
      );

      const headersInit = mockFetch.mock.calls[0]![1]!.headers as HeadersInit;
      expect(getHeader(headersInit, 'Content-Type')).toBeUndefined();
      expect(result).toEqual({ success: true });
    });

    it('handles FormData with custom headers', async () => {
      const formData = new FormData();
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

      await api.request('upload-custom', {
        body: formData,
        headers: { 'X-Custom': 'value' },
      });

      const headersInit = mockFetch.mock.calls[0]![1]!.headers as HeadersInit;
      expect(getHeader(headersInit, 'Content-Type')).toBeUndefined();
      expect(getHeader(headersInit, 'X-Custom')).toBe('value');
    });
  });

  describe('internals', () => {
    interface ApiClientInternals {
      failedQueue: { resolve: (t: string) => void; reject: (e: unknown) => void }[];
      processQueue: (error: unknown, token?: string | null) => void;
    }

    it('processQueue handles null token by resolving with empty string', () => {
      const mockResolve = vi.fn();
      const internals = api as unknown as ApiClientInternals;

      internals.failedQueue = [{ resolve: mockResolve, reject: vi.fn() }];
      internals.processQueue(null, null);

      expect(mockResolve).toHaveBeenCalledWith('');
    });
  });
});
