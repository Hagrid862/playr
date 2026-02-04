import { createMock } from '@golevelup/ts-vitest';
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
    useAuthStore.getState().setAuth({ id: '1' } as any, 'valid-token');

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
});
