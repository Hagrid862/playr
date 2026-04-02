import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { MoveQueueItemCommand } from '../impl/move-queue-item.command';

@CommandHandler(MoveQueueItemCommand)
export class MoveQueueItemHandler implements ICommandHandler<MoveQueueItemCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: MoveQueueItemCommand): Promise<PlaybackState> {
    const { itemId, newPosition, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const ordered = [...current.queue].sort((a, b) => a.position - b.position);
      const fromIndex = ordered.findIndex((item) => item.queueId === itemId);
      if (fromIndex === -1) {
        throw new BadRequestException('Queue item not found.');
      }

      const next = [...ordered];
      const [moved] = next.splice(fromIndex, 1);
      const toIndex = Math.max(0, Math.min(newPosition, next.length));
      next.splice(toIndex, 0, moved);

      const queue = next.map((item, index) => ({
        ...item,
        position: index,
      }));

      return { ...current, queue };
    });
  }
}
