import { Env } from '@/common/config/env.schema';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';
@Injectable()
export class RedisProvider implements OnModuleDestroy {
  public readonly client: Redis;
  private readonly logger = new Logger(RedisProvider.name);

  constructor(private readonly configService: ConfigService<Env>) {
    this.client = new Redis({
      host: this.configService.getOrThrow('REDIS_HOST'),
      port: this.configService.getOrThrow('REDIS_PORT'),
      keyPrefix: 'playr:playback:',
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
