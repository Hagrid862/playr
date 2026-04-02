import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { ShuffleQueueCommand } from '../impl/shuffle-queue.command';

/**
 * Queue order is owned by the client (`command:set-state`). This command is a no-op
 * beyond optimistic concurrency (kept for backward compatibility).
 */
@CommandHandler(ShuffleQueueCommand)
export class ShuffleQueueHandler implements ICommandHandler<ShuffleQueueCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: ShuffleQueueCommand): Promise<PlaybackState> {
    const { expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return current as Omit<PlaybackState, 'version' | 'updatedAt'>;
    });
  }
}
