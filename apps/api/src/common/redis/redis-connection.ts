import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';
import { Env } from '../config/env.schema';

export function getRedisConnectionOptions(
  configService: ConfigService<Env>,
): Pick<RedisOptions, 'host' | 'port' | 'password'> {
  const password = configService.get('REDIS_PASSWORD', { infer: true });

  return {
    host: configService.get('REDIS_HOST', { infer: true }),
    port: configService.get('REDIS_PORT', { infer: true }),
    ...(password ? { password } : {}),
  };
}
