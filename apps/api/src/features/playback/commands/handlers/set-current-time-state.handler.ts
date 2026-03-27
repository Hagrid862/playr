import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetCurrentTimeStateCommand } from '../impl/set-current-time-state.command';

@CommandHandler(SetCurrentTimeStateCommand)
export class SetCurrentTimeStateHandler implements ICommandHandler<SetCurrentTimeStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetCurrentTimeStateCommand): Promise<PlaybackState> {
    const { currentTime, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      if (currentTime > current.trackData.duration) {
        throw new BadRequestException('currentTime cannot be greater than the track duration.');
      }
      return {
        ...current,
        currentTime,
      };
    });
  }
}
