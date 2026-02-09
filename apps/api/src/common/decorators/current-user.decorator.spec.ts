import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { CurrentUser } from './current-user.decorator';

// Helper to extract the factory function from the decorator
function getParamDecoratorFactory(decorator: Function) {
  class Test {
    testMethod(@decorator() _user: any) { }
  }
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'testMethod');
  return metadata[Object.keys(metadata)[0]].factory;
}

describe('CurrentUser Decorator', () => {
  const factory = getParamDecoratorFactory(CurrentUser);

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const createMockContext = (user: any): Partial<ExecutionContext> => ({
    switchToHttp: () =>
      ({
        getRequest: () => ({
          user: user ? { user } : null,
        }),
      }) as any,
  });

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
    const ctx = createMockContext(mockUser) as ExecutionContext;
    const result = factory('nonExistent' as any, ctx);
    expect(result).toBeUndefined();
  });
});
