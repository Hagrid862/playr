import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetFavoriteStateCommand } from '../impl/set-favorite-state.command';

@CommandHandler(SetFavoriteStateCommand)
export class SetFavoriteStateHandler implements ICommandHandler<SetFavoriteStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetFavoriteStateCommand): Promise<PlaybackState> {
    const { favorite, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    if (favorite !== 'favorited' && favorite !== 'disliked' && favorite !== 'not-set') {
      throw new BadRequestException('favorite must be one of: favorited, disliked, not-set');
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        favorited: favorite,
      };
    });
  }
}
