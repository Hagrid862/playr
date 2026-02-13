import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateEnv } from './env.schema';

describe('envSchema', () => {
  const validConfig = {
    DATABASE_URL: 'http://localhost:5432',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    S3_ENDPOINT: 's3.example.com',
    S3_ACCESS_KEY: 'access-key',
    S3_SECRET_KEY: 'secret-key',
    S3_PUBLIC_BUCKET: 'public-bucket',
    S3_PRIVATE_BUCKET: 'private-bucket',
    MAIL_HOST: 'mail.example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should validate a correct config and return parsed data', () => {
    const result = validateEnv(validConfig);

    expect(result).toMatchObject({
      PORT: 8000,
      DATABASE_URL: 'http://localhost:5432',
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      S3_ENDPOINT: 's3.example.com',
      S3_ACCESS_KEY: 'access-key',
      S3_SECRET_KEY: 'secret-key',
      S3_USE_SSL: false,
      S3_PUBLIC_BUCKET: 'public-bucket',
      S3_PRIVATE_BUCKET: 'private-bucket',
      MAIL_HOST: 'mail.example.com',
      MAIL_PORT: 1025,
      MAIL_FROM: 'noreply@playr.com',
      THROTTLE_ENABLED: true,
    });
  });

  it('should throw an error and log if config is invalid', () => {
    const invalidConfig = { ...validConfig, DATABASE_URL: 'not-a-url' };

    expect(() => validateEnv(invalidConfig)).toThrow('Invalid environment variables');
    expect(console.error).toHaveBeenCalled();
  });

  it('should coerce numbers and booleans correctly', () => {
    const config = {
      ...validConfig,
      PORT: '9000',
      S3_USE_SSL: 'true',
    };

    const result = validateEnv(config);

    expect(result.PORT).toBe(9000);
    expect(result.S3_USE_SSL).toBe(true);
  });

  it('should handle missing optional fields', () => {
    const result = validateEnv(validConfig);
    expect(result.MAIL_USER).toBeUndefined();
    expect(result.MAIL_PASS).toBeUndefined();
  });

  it('should include provided optional fields', () => {
    const config = {
      ...validConfig,
      MAIL_USER: 'test-user',
      MAIL_PASS: 'test-pass',
    };

    const result = validateEnv(config);
    expect(result.MAIL_USER).toBe('test-user');
    expect(result.MAIL_PASS).toBe('test-pass');
  });

  it('should validate S3_PUBLIC_URL if provided', () => {
    const config = {
      ...validConfig,
      S3_PUBLIC_URL: 'https://cdn.example.com',
    };

    const result = validateEnv(config);
    expect(result.S3_PUBLIC_URL).toBe('https://cdn.example.com');
  });
});
