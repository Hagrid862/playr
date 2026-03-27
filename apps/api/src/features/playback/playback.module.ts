import { Env } from '@/common/config/env.schema';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import Redis from 'ioredis';
import { AuthModule } from '../auth/auth.module';
import { SetPlaybackStateHandler } from './commands/handlers/set-playback-state.handler';
import { PlaybackGateway } from './playback.gateway';
import { GetPlaybackStateHandler } from './queries/handlers/get-playback-state.handler';
import { PlaybackStatePersistenceService } from './services/playback-state-persistence.service';
import { PLAYBACK_REDIS } from './utils/playback-redis.constrants';

export const QueryHandlers = [GetPlaybackStateHandler];
export const CommandHandlers = [SetPlaybackStateHandler];

@Module({
  imports: [AuthModule, CqrsModule],
  controllers: [],
  providers: [
    ...QueryHandlers,
    ...CommandHandlers,
    PlaybackStatePersistenceService,
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
