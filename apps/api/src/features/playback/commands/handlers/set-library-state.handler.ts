import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetLibraryStateCommand } from '../impl/set-library-state.command';

@CommandHandler(SetLibraryStateCommand)
export class SetLibraryStateHandler implements ICommandHandler<SetLibraryStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetLibraryStateCommand): Promise<PlaybackState> {
    const { inLibrary, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        inLibrary,
      };
    });
  }
}
