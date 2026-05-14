import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { RemoveQueueItemCommand } from '../impl/remove-queue-item.command';

@CommandHandler(RemoveQueueItemCommand)
export class RemoveQueueItemHandler implements ICommandHandler<RemoveQueueItemCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: RemoveQueueItemCommand): Promise<PlaybackState> {
    const { itemId, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const ordered = [...current.queue].sort((a, b) => a.position - b.position);
      const removeIndex = ordered.findIndex((item) => item.queueId === itemId);

      if (removeIndex === -1) {
        throw new BadRequestException('Queue item not found.');
      }

      const next = [...ordered];
      next.splice(removeIndex, 1);
      const queue = next.map((item, index) => ({ ...item, position: index }));
      return { ...current, queue };
    });
  }
}
