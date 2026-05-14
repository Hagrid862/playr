import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState, QueueItem } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { ShuffleQueueCommand } from '../impl/shuffle-queue.command';

@CommandHandler(ShuffleQueueCommand)
export class ShuffleQueueHandler implements ICommandHandler<ShuffleQueueCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: ShuffleQueueCommand): Promise<PlaybackState> {
    const { expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-queue-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return { ...current, queue: shuffleQueue(current.queue) };
    });
  }
}

function shuffleQueue(queue: QueueItem[]): QueueItem[] {
  const items = queue.slice();
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = items[i]!;
    items[i] = items[j]!;
    items[j] = t;
  }
  return items;
}
