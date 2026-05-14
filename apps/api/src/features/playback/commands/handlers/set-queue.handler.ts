import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetQueueCommand } from '../impl/set-queue.command';

@CommandHandler(SetQueueCommand)
export class SetQueueHandler implements ICommandHandler<SetQueueCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetQueueCommand): Promise<PlaybackState> {
    const { items, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const queue = items.map((item, index) => ({
        ...item,
        position: index,
        originalPosition: item.originalPosition,
      }));
      return { ...current, queue };
    });
  }
}
