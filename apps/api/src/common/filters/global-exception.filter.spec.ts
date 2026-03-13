import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '../../features/auth/constants/cookie.constants';
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

    // @ts-expect-error - testing null message handling
    const exception = new HttpException(null, HttpStatus.BAD_REQUEST);

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

    // @ts-expect-error - testing numeric status code handling
    const exception = new HttpException(404, HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Internal server error',
        }),
      }),
    );
  });

  it('should clear refresh token cookie on UNAUTHORIZED when path ends with /auth/refresh', () => {
    const clearCookie = vi.fn();
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie,
    });

    const mockRequest = createMock<Request>({
      url: '/auth/refresh',
      path: '/auth/refresh',
      method: 'POST',
      startTime: Date.now(),
      id: 'test-id',
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    configService.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'development' : undefined,
    );

    const exception = new HttpException('Token expired', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, mockHost);

    const baseOpts = {
      sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
      secure: false, // NODE_ENV is development
    };
    expect(clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE_NAME, {
      ...baseOpts,
      path: '/',
    });
    expect(clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE_NAME, {
      ...baseOpts,
      path: '/auth/refresh',
    });
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('should clear refresh token cookie with secure flag in production', () => {
    const clearCookie = vi.fn();
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie,
    });

    const mockRequest = createMock<Request>({
      url: '/auth/refresh',
      path: '/auth/refresh',
      method: 'POST',
      startTime: Date.now(),
      id: 'test-id',
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    configService.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    );

    const filterProd = new GlobalExceptionFilter(configService);
    const exception = new HttpException('Token expired', HttpStatus.UNAUTHORIZED);

    filterProd.catch(exception, mockHost);

    expect(clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE_NAME, {
      sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
      secure: true,
      path: '/',
    });
    expect(clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE_NAME, {
      sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
      secure: true,
      path: '/auth/refresh',
    });
  });

  it('should not clear refresh token cookie when path does not end with /auth/refresh', () => {
    const clearCookie = vi.fn();
    const mockResponse = createMock<Response>({
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie,
    });

    const mockRequest = createMock<Request>({
      url: '/auth/login',
      path: '/auth/login',
      method: 'POST',
      startTime: Date.now(),
      id: 'test-id',
    });

    const mockHost = createMock<ArgumentsHost>({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    });

    const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, mockHost);

    expect(clearCookie).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });
});
