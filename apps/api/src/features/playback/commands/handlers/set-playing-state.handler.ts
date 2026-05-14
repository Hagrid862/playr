import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetPlayingStateCommand } from '../impl/set-playing-state.command';

@CommandHandler(SetPlayingStateCommand)
export class SetPlayingStateHandler implements ICommandHandler<SetPlayingStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetPlayingStateCommand): Promise<PlaybackState> {
    const { isPlaying, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        isPlaying,
        activeDeviceId: isPlaying ? command.playbackDeviceId : current.activeDeviceId,
      };
    });
  }
}
