import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { getRedisConnectionOptions } from './redis-connection';

function createConfigService(values: Record<string, unknown>): ConfigService {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('getRedisConnectionOptions', () => {
  it('returns host and port without password when REDIS_PASSWORD is unset', () => {
    const configService = createConfigService({
      REDIS_HOST: 'redis.example.com',
      REDIS_PORT: 6380,
      REDIS_PASSWORD: undefined,
    });

    expect(getRedisConnectionOptions(configService)).toEqual({
      host: 'redis.example.com',
      port: 6380,
    });
  });

  it('includes password when REDIS_PASSWORD is set', () => {
    const configService = createConfigService({
      REDIS_HOST: 'redis.example.com',
      REDIS_PORT: 6380,
      REDIS_PASSWORD: 'secret',
    });

    expect(getRedisConnectionOptions(configService)).toEqual({
      host: 'redis.example.com',
      port: 6380,
      password: 'secret',
    });
  });
});
