import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { User } from '@repo/db';
import { userBuilder } from '@repo/testing/builders';
import { describe, expect, it } from 'vitest';
import { AuthenticatedUser } from '../types/auth.types';
import { CurrentUser } from './current-user.decorator';

function getParamDecoratorFactory(decorator: (...args: any[]) => ParameterDecorator) {
  class Test {
    testMethod(@decorator() user: unknown) {
      return user;
    }
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'testMethod');
  return metadata[Object.keys(metadata)[0]].factory;
}

describe('CurrentUser Decorator', () => {
  const factory = getParamDecoratorFactory(CurrentUser);

  const mockUser = userBuilder({
    id: 'user-123',
    username: 'testuser',
  });

  const createMockContext = (user: User | null): ExecutionContext =>
    ({
      switchToHttp: () =>
        ({
          getRequest: () => ({
            user: user ? ({ user } as AuthenticatedUser) : null,
          }),
        }) as any,
    }) as unknown as ExecutionContext;

  it('should return the full user object when no data key is provided', () => {
    const ctx = createMockContext(mockUser) as ExecutionContext;
    const result = factory(undefined, ctx);
    expect(result).toEqual(mockUser);
  });

  it('should return a specific user property when data key is provided', () => {
    const ctx = createMockContext(mockUser) as ExecutionContext;
    const result = factory('id', ctx);
    expect(result).toBe('user-123');
  });

  it('should return null if authContext is missing', () => {
    const ctx = createMockContext(null) as ExecutionContext;
    const result = factory(undefined, ctx);
    expect(result).toBeNull();
  });

  it('should return undefined if a non-existent property is requested', () => {
    const ctx = createMockContext(mockUser);
    const result = factory('nonExistent', ctx);
    expect(result).toBeUndefined();
  });
});
