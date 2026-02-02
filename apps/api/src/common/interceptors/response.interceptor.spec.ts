import { ResponseInterceptor } from './response.interceptor';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WithMeta } from '../utils/with-meta.util';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let reflector: Reflector;

  beforeEach(async () => {
    // Manually create mock reflector
    const mockReflector = {
      get: vi.fn(),
    };

    // Assign to the reflector variable used in tests
    // We cast to unknown first to bypass type check if Reflector has private props,
    // but Reflector interface usually allows this or we just cast to Reflector.
    reflector = mockReflector as unknown as Reflector;

    // Manually instantiate interceptor
    interceptor = new ResponseInterceptor(reflector);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should wrap successful response in standard format', async () => {
    const mockData = { id: 1, name: 'test' };
    const mockRequest = {
      id: 'req-123',
      url: '/test',
      headers: {},
    } as unknown as ExecutionContext;

    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of(mockData),
    };

    vi.spyOn(reflector, 'get').mockReturnValue(false); // No bypass

    const result = await firstValueFrom(interceptor.intercept(context, next));
    expect(result).toEqual({
      success: true,
      data: mockData,
      error: null,
      meta: expect.objectContaining({
        path: '/test',
        requestId: expect.any(String),
      }),
    });
  });

  it('should bypass wrapping if decorator is present', async () => {
    const mockData = { id: 1, name: 'test' };

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/test',
          headers: {},
        }),
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of(mockData),
    };

    vi.spyOn(reflector, 'get').mockReturnValue(true); // Bypass = true

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual(mockData); // Should perform no wrapping
  });

  it('should handle WithMeta wrapper correctly', async () => {
    const mockData = { id: 1 };
    const mockMeta = { page: 1 };
    const withMeta = new WithMeta(mockData, mockMeta);
    const mockRequest = {
      id: 'req-123',
      url: '/test',
      headers: {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of(withMeta),
    };

    vi.spyOn(reflector, 'get').mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result.data).toEqual(mockData);
    expect(result.meta).toEqual(expect.objectContaining(mockMeta));
  });
});
