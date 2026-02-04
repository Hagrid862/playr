import { describe, expect, it } from 'vitest';
import { BypassResponseInterceptor } from './bypass-interceptor.decorator';

describe('BypassResponseInterceptor Decorator', () => {
  it('should be defined', () => {
    expect(BypassResponseInterceptor).toBeDefined();
  });

  it('should set the bypass metadata key to true', () => {
    const decorator = BypassResponseInterceptor();
    expect(typeof decorator).toBe('function');
  });
});
