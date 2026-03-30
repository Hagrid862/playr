import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { AddQueueItemCommand } from '../impl/add-queue-item.command';

@CommandHandler(AddQueueItemCommand)
export class AddQueueItemHandler implements ICommandHandler<AddQueueItemCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: AddQueueItemCommand): Promise<PlaybackState> {
    const { track: item, position: insertAt, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-queue-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const ordered = [...current.queue].sort((a, b) => a.position - b.position);
      const index =
        insertAt === null || insertAt === undefined
          ? ordered.length
          : Math.max(0, Math.min(insertAt, ordered.length));

      const next = [...ordered];
      next.splice(index, 0, { ...item });
      const queue = next.map((q, i) => ({ ...q, position: i }));

      return { ...current, queue };
    });
  }
}
