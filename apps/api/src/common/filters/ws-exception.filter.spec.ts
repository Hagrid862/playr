import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackWsExceptionFilter } from './ws-exception.filter';

describe('PlaybackWsExceptionFilter', () => {
  let filter: PlaybackWsExceptionFilter;

  beforeEach(() => {
    filter = new PlaybackWsExceptionFilter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException by converting it to WsException', () => {
    // Arrange
    const mockClient = { emit: vi.fn() };
    const mockContext = {
      switchToWs: () => ({
        getClient: () => mockClient,
        getPattern: () => 'test_pattern',
        getData: () => ({ foo: 'bar' }),
      }),
    };
    const mockHost = createMock<ArgumentsHost>(mockContext as any);

    // We mock handleError which is a protected method from BaseWsExceptionFilter
    const handleErrorSpy = vi.spyOn(filter as any, 'handleError').mockImplementation(() => {});

    const exceptionResponse = { message: 'Forbidden access', error: 'Forbidden', statusCode: 403 };
    const exception = new HttpException(exceptionResponse, HttpStatus.FORBIDDEN);

    // Act
    filter.catch(exception, mockHost);

    // Assert
    expect(handleErrorSpy).toHaveBeenCalledWith(
      mockClient,
      expect.any(WsException),
      expect.objectContaining({
        pattern: 'test_pattern',
        data: { foo: 'bar' },
      }),
    );

    const wsExceptionArgument = handleErrorSpy.mock.calls[0][1] as WsException;
    expect(wsExceptionArgument.getError()).toEqual(exceptionResponse);
  });

  it('should call super.catch for non-HttpException errors', () => {
    // Arrange
    const superCatchSpy = vi
      .spyOn(BaseWsExceptionFilter.prototype, 'catch')
      .mockImplementation(() => {});
    const mockHost = createMock<ArgumentsHost>();
    const exception = new Error('Some generic error');

    // Act
    filter.catch(exception, mockHost);

    // Assert
    expect(superCatchSpy).toHaveBeenCalledWith(exception, mockHost);
  });
});
