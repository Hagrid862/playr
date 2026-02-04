import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiClient } from './api-client';
import { ApiError } from './api-error';
import { z } from 'zod';
import { createMock } from '@golevelup/ts-vitest';

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
});
