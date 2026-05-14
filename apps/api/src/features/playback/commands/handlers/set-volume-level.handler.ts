import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetVolumeLevelStateCommand } from '../impl/set-volume-level-state.command';

@CommandHandler(SetVolumeLevelStateCommand)
export class SetVolumeLevelStateHandler implements ICommandHandler<SetVolumeLevelStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetVolumeLevelStateCommand): Promise<PlaybackState> {
    const { volume, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        volume,
      };
    });
  }
}
