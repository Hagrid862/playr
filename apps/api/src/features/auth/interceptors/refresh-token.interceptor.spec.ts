import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { of } from 'rxjs';
import { RefreshTokenInterceptor } from './refresh-token.interceptor';

describe('RefreshTokenInterceptor', () => {
  let interceptor: RefreshTokenInterceptor;
  let configService: DeepMocked<ConfigService>;
  let context: DeepMocked<ExecutionContext>;
  let next: DeepMocked<CallHandler>;
  let response: DeepMocked<Response>;

  beforeEach(() => {
    configService = createMock<ConfigService>();
    interceptor = new RefreshTokenInterceptor(configService);

    response = createMock<Response>();
    context = createMock<ExecutionContext>();
    context.switchToHttp().getResponse.mockReturnValue(response);

    next = createMock<CallHandler>();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set refreshToken cookie if refreshToken is in response data', async () => {
    // Arrange
    const mockData = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: '1' },
    };
    next.handle.mockReturnValue(of(mockData));
    configService.get.mockReturnValue('development');

    // Act
    const observable = interceptor.intercept(context, next);
    const result = await new Promise((resolve) => observable.subscribe(resolve));

    // Assert
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        path: '/',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      user: { id: '1' },
    });
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('should set secure cookie in production', async () => {
    // Arrange
    const mockData = { refreshToken: 'token' };
    next.handle.mockReturnValue(of(mockData));
    configService.get.mockImplementation((key) => {
      if (key === 'NODE_ENV') return 'production';
      return null;
    });

    // Act
    const observable = interceptor.intercept(context, next);
    await new Promise((resolve) => observable.subscribe(resolve));

    // Assert
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'token',
      expect.objectContaining({
        secure: true,
      }),
    );
  });

  it('should not set cookie if refreshToken is missing', async () => {
    // Arrange
    const mockData = { accessToken: 'access-token', user: { id: '1' } };
    next.handle.mockReturnValue(of(mockData));

    // Act
    const observable = interceptor.intercept(context, next);
    const result = await new Promise((resolve) => observable.subscribe(resolve));

    // Assert
    expect(response.cookie).not.toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  it('should return null/undefined if data is falsy', async () => {
    // Arrange
    next.handle.mockReturnValue(of(null));

    // Act
    const observable = interceptor.intercept(context, next);
    const result = await new Promise((resolve) => observable.subscribe(resolve));

    // Assert
    expect(response.cookie).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
