import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let configService: DeepMocked<ConfigService>;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    configService = createMock<ConfigService>();
    configService.get.mockReturnValue('development');
    filter = new GlobalExceptionFilter(configService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  it('should handle HttpException with object message', () => {
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      url: '/test',
      id: 'test-id',
      startTime: undefined,
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const objectMessage = { message: 'Custom error message', hint: 'Check docs' };
    const exception = new HttpException(objectMessage, HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Custom error message',
        }),
      }),
    );
  });

  it('should handle HttpException with object message missing message property', () => {
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      url: '/test',
      id: 'test-id',
      startTime: undefined,
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const objectMessage = { error: 'some_error' };
    const exception = new HttpException(objectMessage, HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: objectMessage,
        }),
      }),
    );
  });

  it('should handle HttpException with null message', () => {
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      url: '/test',
      id: 'test-id',
      startTime: undefined,
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const exception = new HttpException(null as any, HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Internal server error',
        }),
      }),
    );
  });

  it('should handle HttpException with number message', () => {
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      url: '/test',
      id: 'test-id',
      startTime: undefined,
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const exception = new HttpException(404 as any, HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Internal server error',
        }),
      }),
    );
  });

  it('should clear auth cookies when unauthorized error occurs on the refresh path', () => {
    // Arrange
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    });

    const mockRequest = createMock<Request>({
      // We use a path that ends with /auth/refresh to trigger the logic
      path: '/auth/refresh',
      url: 'auth/refresh',
      id: 'test-id',
      startTime: Date.now(),
      headers: {},
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    // Mock production env to test the 'secure: true' branch
    configService.get.mockReturnValue('production');
    
    // Trigger a 401 Unauthorized
    const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    // Act
    filter.catch(exception, mockHost);

    // Assert
    // 1. Check that clearCookie was called twice (once for '/' and once for '/auth/refresh')
    expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
    
    // 2. Verify the arguments for the first call
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      expect.any(String), // REFRESH_TOKEN_COOKIE_NAME
      expect.objectContaining({
        secure: true,
        path: '/',
      }),
    );

    // 3. Verify the response still returns the standard JSON
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });
});
