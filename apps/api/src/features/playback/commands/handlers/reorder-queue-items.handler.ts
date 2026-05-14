import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { ReorderQueueItemsCommand } from '../impl/reorder-queue-items.command';

function sortedQueueIds(items: { queueId: string }[]): string[] {
  return [...items].map((i) => i.queueId).sort();
}

@CommandHandler(ReorderQueueItemsCommand)
export class ReorderQueueItemsHandler implements ICommandHandler<ReorderQueueItemsCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: ReorderQueueItemsCommand): Promise<PlaybackState> {
    const { items: received, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-queue-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const currentOrdered = [...current.queue].sort((a, b) => a.position - b.position);

      if (received.length !== currentOrdered.length) {
        throw new BadRequestException('Reorder list must include every queue item exactly once.');
      }

      const currentIds = sortedQueueIds(currentOrdered);
      const receivedIds = sortedQueueIds(received);
      if (
        currentIds.length !== receivedIds.length ||
        currentIds.some((id, i) => id !== receivedIds[i])
      ) {
        throw new BadRequestException('Reorder list must include every queue item exactly once.');
      }

      const byQueueId = new Map(currentOrdered.map((item) => [item.queueId, item]));
      const queue: PlaybackState['queue'] = received.map((ref, index) => {
        const item = byQueueId.get(ref.queueId);
        if (!item) {
          throw new BadRequestException('Queue item not found.');
        }
        return { ...item, position: index };
      });

      return { ...current, queue };
    });
  }
}
