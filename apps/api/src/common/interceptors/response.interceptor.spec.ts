import { DeepMocked, createMock } from '@golevelup/ts-vitest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WithMeta } from '../utils/with-meta.util';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let reflector: DeepMocked<Reflector>;

  beforeEach(async () => {
    reflector = createMock<Reflector>();
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
    const mockRequest = createMock<Request>({
      id: 'req-123',
      url: '/test',
      startTime: Date.now(),
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of(mockData),
    };

    reflector.get.mockReturnValue(false); // No bypass

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

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () =>
          createMock<Request>({
            url: '/test',
            startTime: Date.now(),
          }),
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of(mockData),
    };

    reflector.get.mockReturnValue(true); // Bypass = true

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual(mockData); // Should perform no wrapping
  });

  it('should handle WithMeta wrapper correctly', async () => {
    const mockData = { id: 1 };
    const mockMeta = { page: 1 };
    const withMeta = new WithMeta(mockData, mockMeta);
    const mockRequest = createMock<Request>({
      id: 'req-123',
      url: '/test',
      startTime: Date.now(),
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of(withMeta),
    };

    reflector.get.mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result.data).toEqual(mockData);
    expect(result.data).toEqual(mockData);
    expect(result.meta).toEqual(expect.objectContaining(mockMeta));
  });

  it('should generate requestId if id and header are missing', async () => {
    const mockRequest = createMock<Request>({
      url: '/test',
      headers: {},
      id: undefined,
      startTime: undefined,
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of({}),
    };

    reflector.get.mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));
    expect(result.meta.requestId).toMatch(/^req_/);
  });

  it('should use x-request-id from header if present', async () => {
    const mockRequest = createMock<Request>({
      url: '/test',
      headers: {
        'x-request-id': 'header-id',
      },
      id: undefined,
      startTime: undefined,
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of({}),
    };

    reflector.get.mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));
    expect(result.meta.requestId).toBe('header-id');
  });

  it('should handle x-request-id as an array', async () => {
    const mockRequest = createMock<Request>({
      url: '/test',
      headers: {
        'x-request-id': ['first-id', 'second-id'],
      },
      id: undefined,
      startTime: undefined,
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of({}),
    };

    reflector.get.mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));
    expect(result.meta.requestId).toBe('first-id');
  });

  it('should not include duration if startTime is missing', async () => {
    const mockRequest = createMock<Request>({
      url: '/test',
      headers: {},
      id: 'test-id',
      startTime: undefined,
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of({}),
    };

    reflector.get.mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));
    expect(result.meta.duration).toBeUndefined();
  });

  it('should handle null response data', async () => {
    const mockRequest = createMock<Request>({
      url: '/test',
      id: 'test-id',
      startTime: undefined,
    });

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    });

    const next: CallHandler = {
      handle: () => of(null),
    };

    reflector.get.mockReturnValue(false);

    const result = await firstValueFrom(interceptor.intercept(context, next));
    expect(result.data).toBeNull();
  });
});
