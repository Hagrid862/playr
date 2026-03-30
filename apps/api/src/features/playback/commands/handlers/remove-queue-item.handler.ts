import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { RemoveQueueItemCommand } from '../impl/remove-queue-item.command';

@CommandHandler(RemoveQueueItemCommand)
export class RemoveQueueItemHandler implements ICommandHandler<RemoveQueueItemCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: RemoveQueueItemCommand): Promise<PlaybackState> {
    const { itemId, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-queue-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const ordered = [...current.queue].sort((a, b) => a.position - b.position);
      const filtered = ordered.filter(
        (item) => item.queueId !== itemId && item.track.id !== itemId,
      );
      if (filtered.length === ordered.length) {
        throw new BadRequestException('Queue item not found.');
      }
      const queue = filtered.map((item, index) => ({ ...item, position: index }));
      return { ...current, queue };
    });
  }
}
