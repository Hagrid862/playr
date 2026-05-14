import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { SetCurrentTimeStateHandler } from './commands/handlers/set-current-time-state.handler';
import { SetFavoriteStateHandler } from './commands/handlers/set-favorite-state.handler';
import { SetLibraryStateHandler } from './commands/handlers/set-library-state.handler';
import { SetPlaybackStateHandler } from './commands/handlers/set-playback-state.handler';
import { SetPlayingStateHandler } from './commands/handlers/set-playing-state.handler';
import { SetRepeatStateHandler } from './commands/handlers/set-repeat-state.handler';
import { SetShuffleStateHandler } from './commands/handlers/set-shuffle-state.handler';
import { SetTrackStateHandler } from './commands/handlers/set-track-state.handler';
import { SetVolumeLevelStateHandler } from './commands/handlers/set-volume-level.handler';
import { PlaybackGateway } from './playback.gateway';
import { GetPlaybackStateHandler } from './queries/handlers/get-playback-state.handler';
import { PlaybackStatePersistenceService } from './services/playback-state-persistence.service';
import { PLAYBACK_REDIS } from './utils/playback-redis.constants';
import { RedisProvider } from './utils/redis.provider';

export const QueryHandlers = [GetPlaybackStateHandler];
export const CommandHandlers = [
  SetPlaybackStateHandler,
  SetPlayingStateHandler,
  SetShuffleStateHandler,
  SetRepeatStateHandler,
  SetTrackStateHandler,
  SetVolumeLevelStateHandler,
  SetLibraryStateHandler,
  SetFavoriteStateHandler,
  SetCurrentTimeStateHandler,
];

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
      useFactory: (redisProvider: RedisProvider) => redisProvider.client,
      inject: [RedisProvider],
    },
    RedisProvider,
  ],
  exports: [PLAYBACK_REDIS],
})
export class PlaybackModule {}
