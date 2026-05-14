import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetRepeatStateCommand } from '../impl/set-repeat-state.command';

@CommandHandler(SetRepeatStateCommand)
export class SetRepeatStateHandler implements ICommandHandler<SetRepeatStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetRepeatStateCommand): Promise<PlaybackState> {
    const { repeatMode, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        repeatMode,
      };
    });
  }
}
