import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: () => void;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should generate a new request ID if header is missing', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.id).toBeDefined();
    expect(mockRequest.id).toMatch(/^req_/);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', mockRequest.id);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use existing request ID from headers if present', () => {
    const existingId = 'existing-id-123';
    mockRequest.headers!['x-request-id'] = existingId;

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.id).toBe(existingId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set startTime on the request', () => {
    const now = 1234567890;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.startTime).toBe(now);
  });

  it('should handle x-request-id being an array', () => {
    const existingId = 'id-from-array';
    mockRequest.headers!['x-request-id'] = [existingId];

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    // .toString() on ['id-from-array'] gives 'id-from-array'
    expect(mockRequest.id).toBe(existingId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
  });
});
