import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { ClearQueueCommand } from '../impl/clear-queue.command';

@CommandHandler(ClearQueueCommand)
export class ClearQueueHandler implements ICommandHandler<ClearQueueCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: ClearQueueCommand): Promise<PlaybackState> {
    const { expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-queue-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return { ...current, queue: [] };
    });
  }
}
