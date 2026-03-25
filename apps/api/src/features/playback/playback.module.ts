import { Env } from '@/common/config/env.schema';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthModule } from '../auth/auth.module';
import { PlaybackGateway } from './playback.gateway';

export const PLAYBACK_REDIS = Symbol('PLAYBACK_REDIS');

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [
    PlaybackGateway,
    {
      provide: PLAYBACK_REDIS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) =>
        new Redis({
          host: configService.getOrThrow('REDIS_HOST'),
          port: configService.getOrThrow('REDIS_PORT'),
          keyPrefix: 'playr:playback:',
        }),
    },
  ],
  exports: [PLAYBACK_REDIS],
})
export class PlaybackModule {}
