import { Env } from '@/common/config/env.schema';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';
@Injectable()
export class RedisProvider implements OnModuleDestroy {
  public readonly client: Redis;

  constructor(private readonly configService: ConfigService<Env>) {
    this.client = new Redis({
      host: this.configService.getOrThrow('REDIS_HOST'),
      port: this.configService.getOrThrow('REDIS_PORT'),
      keyPrefix: 'playr:playback:',
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
