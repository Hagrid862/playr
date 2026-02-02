import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch HttpException and return formatted error response', () => {
    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockResponse = {
      status: mockStatus,
    } as unknown as Response;

    const mockRequest = {
      url: '/test',
      method: 'GET',
      headers: {},
    } as unknown as Request;

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith(
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
    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockResponse = {
      status: mockStatus,
    } as unknown as Response;

    const mockRequest = {
      url: '/test',
      headers: {},
    } as unknown as Request;

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    const exception = new Error('Something went wrong');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error', // The filter overrides unknown error messages for security usually, or checks if it's an object
        },
      }),
    );
  });
});
