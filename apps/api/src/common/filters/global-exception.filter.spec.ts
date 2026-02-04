import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { createMock } from '@golevelup/ts-vitest';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    filter = new GlobalExceptionFilter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch HttpException and return formatted error response', () => {
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      url: '/test',
      method: 'GET',
      startTime: Date.now(),
      id: 'test-id',
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: null,
        error: {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden',
        },
      }),
    );
  });

  it('should catch unknown errors and return 500', () => {
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      url: '/test',
      startTime: Date.now(),
      id: 'test-id',
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const exception = new Error('Something went wrong');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        },
      }),
    );
  });
});
