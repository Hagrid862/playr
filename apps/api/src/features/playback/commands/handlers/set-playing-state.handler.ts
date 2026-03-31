import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlayingStateCommand } from '../impl/set-playing-state.command';

@CommandHandler(SetPlayingStateCommand)
export class SetPlayingStateHandler implements ICommandHandler<SetPlayingStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetPlayingStateCommand): Promise<PlaybackState> {
    const { isPlaying, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        isPlaying,
        activeDeviceId: isPlaying ? command.playbackDeviceId : current.activeDeviceId,
        deviceName: isPlaying ? command.playbackDeviceName : current.deviceName,
        deviceIcon: isPlaying ? command.playbackDeviceIcon : current.deviceIcon,
      };
    });
  }
}
