import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
// @ts-expect-error - ignore type errors from testing package imports
import { buildUser, createMockExecutionContext } from '@repo/testing';
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

  const mockUser = buildUser({
    id: 'user-123',
    username: 'testuser',
  });

  it('should return the full user object when no data key is provided', () => {
    const ctx = createMockExecutionContext<{ user: AuthenticatedUser | null }>({
      request: { user: { user: mockUser } },
    });
    const result = factory(undefined, ctx);
    expect(result).toEqual(mockUser);
  });

  it('should return a specific user property when data key is provided', () => {
    const ctx = createMockExecutionContext<{ user: AuthenticatedUser | null }>({
      request: { user: { user: mockUser } },
    });
    const result = factory('id', ctx);
    expect(result).toBe('user-123');
  });

  it('should return null if authContext is missing', () => {
    const ctx = createMockExecutionContext<{ user: AuthenticatedUser | null }>({
      request: { user: null },
    });
    const result = factory(undefined, ctx);
    expect(result).toBeNull();
  });

  it('should return undefined if a non-existent property is requested', () => {
    const ctx = createMockExecutionContext<{ user: AuthenticatedUser | null }>({
      request: { user: { user: mockUser } },
    });
    const result = factory('nonExistent', ctx);
    expect(result).toBeUndefined();
  });
});
