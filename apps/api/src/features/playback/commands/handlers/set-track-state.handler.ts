import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState, PlaybackTrackSchema } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetTrackStateCommand } from '../impl/set-track-state.command';

@CommandHandler(SetTrackStateCommand)
export class SetTrackStateHandler implements ICommandHandler<SetTrackStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetTrackStateCommand): Promise<PlaybackState> {
    const { track, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    const serialized = PlaybackTrackSchema.safeParse(track);
    if (!serialized.success) {
      throw new BadRequestException('Invalid track data');
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        trackData: serialized.data,
      };
    });
  }
}
