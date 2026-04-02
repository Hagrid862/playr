import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetRepeatStateCommand } from '../impl/set-repeat-state.command';

@CommandHandler(SetRepeatStateCommand)
export class SetRepeatStateHandler implements ICommandHandler<SetRepeatStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetRepeatStateCommand): Promise<PlaybackState> {
    const { repeatMode, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        repeatMode,
      };
    });
  }
}
