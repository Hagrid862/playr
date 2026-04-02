import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetVolumeLevelStateCommand } from '../impl/set-volume-level-state.command';

@CommandHandler(SetVolumeLevelStateCommand)
export class SetVolumeLevelStateHandler implements ICommandHandler<SetVolumeLevelStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetVolumeLevelStateCommand): Promise<PlaybackState> {
    const { volume, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        volume,
      };
    });
  }
}
