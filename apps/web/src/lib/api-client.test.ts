import { createMock } from '@golevelup/ts-vitest';
import type { ZodUser } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, apiClient } from './api-client';
import { ApiError } from './api-error';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs a GET request correctly', async () => {
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      }),
    );

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
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      }),
    );

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

  it('validates response with Zod schema', async () => {
    const schema = z.object({ id: z.number() });
    const validResponse = { id: 123 };

    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => validResponse,
      }),
    );

    const result = await api.request('user', { zodSchema: schema });
    expect(result).toEqual(validResponse);
  });

  it('throws ZodError on validation failure', async () => {
    const schema = z.object({ id: z.number() });
    const invalidResponse = { id: 'not-a-number' };

    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => invalidResponse,
      }),
    );

    await expect(api.request('user', { zodSchema: schema })).rejects.toThrow();
  });

  it('throws ApiError on non-2xx response', async () => {
    const errorResponse = { message: 'Not Found' };
    mockFetch.mockResolvedValue(
      createMock<Response>({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorResponse,
      }),
    );

    await expect(api.request('unknown')).rejects.toThrow(ApiError);
    await expect(api.request('unknown')).rejects.toThrow('Not Found');
  });

  it('handles empty 204 response', async () => {
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 204,
        json: async () => ({}), // Should not be called usually if handled correctly
      }),
    );

    const result = await api.request('no-content');
    expect(result).toEqual({});
  });

  it('apiClient wrapper works as expected', async () => {
    const mockResponse = { data: 'wrapper' };
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      }),
    );

    const result = await apiClient('wrapper-test');
    expect(result).toEqual(mockResponse);
  });

  it('adds Authorization header when token exists', async () => {
    const { useAuthStore } = await import('@/stores/auth.store');
    useAuthStore.getState().setAuth(createMock<ZodUser>({ id: '1' }), 'valid-token');

    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }),
    );

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

  it('handles 401 and refreshes token successfully', async () => {
    const { useAuthStore } = await import('@/stores/auth.store');
    useAuthStore.getState().logout();

    // 1st call: Original request returns 401
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      }),
    );

    // 2nd call: Refresh request returns 200 with new token
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ data: { accessToken: 'new-token' } }),
      }),
    );

    // 3rd call: Retried original request returns 200
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }),
    );

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
    const { useAuthStore } = await import('@/stores/auth.store');
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

    // 1st call: Original request returns 401
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    // 2nd call: Refresh request returns 401
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    await expect(api.request('fail-refresh')).rejects.toThrow();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('logs out on refresh exception', async () => {
    const { useAuthStore } = await import('@/stores/auth.store');
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );
    mockFetch.mockRejectedValueOnce(new Error('Network error during refresh'));

    await expect(api.request('refresh-error')).rejects.toThrow();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('handles JSON parsing failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('JSON parse error');
        },
      }),
    );

    // This should hit the .catch(() => ({})) on line 80
    const request = api.request('bad-json');
    await expect(request).rejects.toThrow(ApiError);
    await expect(request).rejects.toMatchObject({ data: {} });
  });

  it('handles FormData body correctly', async () => {
    const formData = new FormData();
    formData.append('file', 'test-content');

    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }),
    );

    const result = await api.request('upload', { body: formData });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('upload'),
      expect.objectContaining({
        body: formData,
      }),
    );

    // Verify Content-Type was deleted
    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders['Content-Type']).toBeUndefined();
    expect(result).toEqual({ success: true });
  });

  it('queues concurrent requests during refresh and retries them', async () => {
    const { useAuthStore } = await import('@/stores/auth.store');
    useAuthStore.getState().logout();

    // 1st request: Returns 401, starts refresh
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    // 2nd request: Concurrent request also returning 401, should be queued
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    // Refresh response
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ data: { accessToken: 'shared-token' } }),
      }),
    );

    // Two successful retries after refresh
    mockFetch.mockResolvedValue(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }),
    );

    // Start both requests concurrently
    const [res1, res2] = await Promise.all([api.request('req1'), api.request('req2')]);

    expect(res1).toEqual({ success: true });
    expect(res2).toEqual({ success: true });
    expect(useAuthStore.getState().accessToken).toBe('shared-token');
  });

  it('rejects queued requests if refresh fails', async () => {
    const { useAuthStore } = await import('@/stores/auth.store');
    useAuthStore.getState().logout();

    // 1st request fails with 401
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    // 2nd request concurrent
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    // Refresh fails
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    const [res1, res2] = await Promise.allSettled([api.request('req1'), api.request('req2')]);

    expect(res1.status).toBe('rejected');
    expect(res2.status).toBe('rejected');
  });

  it('handles refresh response with missing token in queued requests', async () => {
    const { useAuthStore } = await import('@/stores/auth.store');
    useAuthStore.getState().logout();

    // 1st request: Returns 401, starts refresh
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );
    // 2nd request: Concurrent, gets queued
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    // Refresh returns 200 but NO token in data
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      }),
    );

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

  it('handles FormData with custom headers', async () => {
    const formData = new FormData();
    mockFetch.mockResolvedValueOnce(
      createMock<Response>({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }),
    );

    await api.request('upload-custom', {
      body: formData,
      headers: { 'X-Custom': 'value' },
    });

    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders['Content-Type']).toBeUndefined();
    expect(callHeaders['X-Custom']).toBe('value');
  });

  // Create a type-safe accessor for private members of ApiClient for testing purposes.
  // This avoids using 'any' and maintains code quality standards.
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
