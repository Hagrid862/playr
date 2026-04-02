import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetShuffleStateCommand } from '../impl/set-shuffle-state.command';

@CommandHandler(SetShuffleStateCommand)
export class SetShuffleStateHandler implements ICommandHandler<SetShuffleStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetShuffleStateCommand): Promise<PlaybackState> {
    const { shuffle, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      if (shuffle === current.shuffle) {
        return current as Omit<PlaybackState, 'version' | 'updatedAt'>;
      }

      return {
        ...current,
        shuffle,
      };
    });
  }
}
