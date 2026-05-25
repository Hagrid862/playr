import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { SetNextQueueItemHandler } from './commands/handlers/add-next-queue-item.handler';
import { AddQueueItemHandler } from './commands/handlers/add-queue-item.handler';
import { ClearQueueHandler } from './commands/handlers/clear-queue.handler';
import { MoveQueueItemHandler } from './commands/handlers/move-queue-item.handler';
import { RemoveQueueItemHandler } from './commands/handlers/remove-queue-item.handler';
import { ReorderQueueItemsHandler } from './commands/handlers/reorder-queue-items.handler';
import { SetCurrentTimeStateHandler } from './commands/handlers/set-current-time-state.handler';
import { SetActiveDeviceHandler } from './commands/handlers/set-active-device.handler';
import { SetFavoriteStateHandler } from './commands/handlers/set-favorite-state.handler';
import { SetLibraryStateHandler } from './commands/handlers/set-library-state.handler';
import { SetPlaybackStateHandler } from './commands/handlers/set-playback-state.handler';
import { SetPlayingStateHandler } from './commands/handlers/set-playing-state.handler';
import { SetQueueHandler } from './commands/handlers/set-queue.handler';
import { SetRepeatStateHandler } from './commands/handlers/set-repeat-state.handler';
import { SetShuffleStateHandler } from './commands/handlers/set-shuffle-state.handler';
import { SetTrackStateHandler } from './commands/handlers/set-track-state.handler';
import { SetVolumeLevelStateHandler } from './commands/handlers/set-volume-level.handler';
import { ShuffleQueueHandler } from './commands/handlers/shuffle-queue.handler';
import { PlaybackGateway } from './playback.gateway';
import { GetPlaybackStateHandler } from './queries/handlers/get-playback-state.handler';
import { GetQueueStateHandler } from './queries/handlers/get-queue-state.handler';
import { PlaybackDeviceRegistryService } from './services/playback-device-registry.service';
import { PlaybackLibraryFlagsService } from './services/playback-library-flags.service';
import { PlaybackStatePersistenceService } from './services/playback-state-persistence.service';
import { PLAYBACK_REDIS } from './utils/playback-redis.constants';
import { RedisProvider } from './utils/redis.provider';

export const QueryHandlers = [GetPlaybackStateHandler, GetQueueStateHandler];
export const CommandHandlers = [
  SetPlaybackStateHandler,
  SetActiveDeviceHandler,
  SetPlayingStateHandler,
  SetShuffleStateHandler,
  SetRepeatStateHandler,
  SetTrackStateHandler,
  SetVolumeLevelStateHandler,
  SetLibraryStateHandler,
  SetFavoriteStateHandler,
  SetCurrentTimeStateHandler,
  AddQueueItemHandler,
  ClearQueueHandler,
  MoveQueueItemHandler,
  RemoveQueueItemHandler,
  ReorderQueueItemsHandler,
  SetNextQueueItemHandler,
  SetQueueHandler,
  ShuffleQueueHandler,
];

@Module({
  imports: [AuthModule, CqrsModule],
  controllers: [],
  providers: [
    ...QueryHandlers,
    ...CommandHandlers,
    PlaybackDeviceRegistryService,
    PlaybackLibraryFlagsService,
    PlaybackStatePersistenceService,
    PlaybackGateway,
    {
      provide: PLAYBACK_REDIS,
      useFactory: (redisProvider: RedisProvider) => redisProvider.client,
      inject: [RedisProvider],
    },
    RedisProvider,
  ],
  exports: [PLAYBACK_REDIS, PlaybackStatePersistenceService, PlaybackGateway],
})
export class PlaybackModule {}
