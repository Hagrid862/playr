import { describe, expect, it, vi, afterEach } from 'vitest';
import { getCorsOrigin, isProductionNodeEnv } from './cors-config';

describe('cors-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isProductionNodeEnv', () => {
    it('should return true for production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(isProductionNodeEnv()).toBe(true);
    });

    it('should return true for prod', () => {
      vi.stubEnv('NODE_ENV', 'prod');
      expect(isProductionNodeEnv()).toBe(true);
    });

    it('should return false for development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(isProductionNodeEnv()).toBe(false);
    });

    it('should default to development and return false if NODE_ENV is missing', () => {
      vi.stubEnv('NODE_ENV', '');
      expect(isProductionNodeEnv()).toBe(false);
    });
  });

  describe('getCorsOrigin', () => {
    it('should return true in non-production environment', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(getCorsOrigin()).toBe(true);
    });

    it('should return origins array in production if CORS_ALLOWED_ORIGINS is set', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://example.com , https://app.playr.com');

      const result = getCorsOrigin();

      expect(result).toEqual(['https://example.com', 'https://app.playr.com']);
    });

    it('should return empty array and warn if CORS_ALLOWED_ORIGINS is not set in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('CORS_ALLOWED_ORIGINS', '');
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getCorsOrigin();

      expect(result).toEqual([]);
      expect(spy).toHaveBeenCalled();
    });

    it('should filter out empty origins', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://example.com,, ,https://test.com');

      expect(getCorsOrigin()).toEqual(['https://example.com', 'https://test.com']);
    });
  });
});
