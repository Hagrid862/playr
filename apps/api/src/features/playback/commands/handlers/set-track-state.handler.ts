import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState, PlaybackTrackSchema } from '@repo/contracts';
import { PlaybackLibraryFlagsService } from '../../services/playback-library-flags.service';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetTrackStateCommand } from '../impl/set-track-state.command';

@CommandHandler(SetTrackStateCommand)
export class SetTrackStateHandler implements ICommandHandler<SetTrackStateCommand> {
  constructor(
    private readonly persistence: PlaybackStatePersistenceService,
    private readonly libraryFlags: PlaybackLibraryFlagsService,
  ) {}

  async execute(command: SetTrackStateCommand): Promise<PlaybackState> {
    const { track, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    const serialized = PlaybackTrackSchema.safeParse(track);
    if (!serialized.success) {
      throw new BadRequestException('Invalid track data');
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, async (current) => {
      const flags = await this.libraryFlags.resolveForTrack(command.userId, serialized.data.trackId);
      return {
        ...current,
        trackData: serialized.data,
        favorited: flags.favorited,
        inLibrary: flags.inLibrary,
      };
    });
  }
}
