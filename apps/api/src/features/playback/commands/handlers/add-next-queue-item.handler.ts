import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetNextQueueItemCommand } from '../impl/set-next-queue-item.command';

@CommandHandler(SetNextQueueItemCommand)
export class SetNextQueueItemHandler implements ICommandHandler<SetNextQueueItemCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetNextQueueItemCommand): Promise<PlaybackState> {
    const { track, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-queue-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const ordered = [...current.queue].sort((a, b) => a.position - b.position);
      const currentIndex = ordered.findIndex((item) => item.track.id === current.trackData.id);

      const next = [...ordered];
      const insertIndex = currentIndex === -1 ? 0 : currentIndex + 1;
      next.splice(insertIndex, 0, { ...track });

      // Ensure sequential positions
      const queue = next.map((item, idx) => ({ ...item, position: idx }));

      return { ...current, queue };
    });
  }
}
