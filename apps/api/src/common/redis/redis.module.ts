import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Env } from '../config/env.schema';
import { getRedisConnectionOptions } from './redis-connection';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => {
        const logger = new Logger('RedisModule');
        const redis = new Redis({
          ...getRedisConnectionOptions(configService),
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        });

        redis.on('error', (error) => {
          const details = error.stack ?? error.message;
          logger.error('Redis connection error', details);
        });
        redis.on('connect', () => logger.log('Redis connected'));
        redis.on('ready', () => logger.log('Redis ready'));

        return redis;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule implements OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch {
      this.logger.warn('Redis quit failed, forcing disconnect');
      this.redis.disconnect();
    }
  }
}
