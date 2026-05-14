import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetLibraryStateCommand } from '../impl/set-library-state.command';

@CommandHandler(SetLibraryStateCommand)
export class SetLibraryStateHandler implements ICommandHandler<SetLibraryStateCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetLibraryStateCommand): Promise<PlaybackState> {
    const { inLibrary, expectedVersion } = command.request;

    if (expectedVersion === 0) {
      throw new BadRequestException(
        'expectedVersion must be the current server version; use set-playback-state to create state first one.',
      );
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      return {
        ...current,
        inLibrary,
      };
    });
  }
}
