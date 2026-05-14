import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetFavoriteStateCommand } from '../impl/set-favorite-state.command';

@CommandHandler(SetFavoriteStateCommand)
export class SetFavoriteStateHandler implements ICommandHandler<SetFavoriteStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetFavoriteStateCommand): Promise<PlaybackState> {
    const { favorite, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        favorited: favorite,
      };
    });
  }
}
