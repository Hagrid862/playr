import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { ClearQueueCommand } from '../impl/clear-queue.command';

@CommandHandler(ClearQueueCommand)
export class ClearQueueHandler implements ICommandHandler<ClearQueueCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: ClearQueueCommand): Promise<PlaybackState> {
    const { expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return { ...current, queue: [] };
    });
  }
}
