import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetShuffleStateCommand } from '../impl/set-shuffle-state.command';

@CommandHandler(SetShuffleStateCommand)
export class SetShuffleStateHandler implements ICommandHandler<SetShuffleStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetShuffleStateCommand): Promise<PlaybackState> {
    const { shuffle, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        shuffle,
      };
    });
  }
}
