import { PlaybackGateway } from '@/features/playback/playback.gateway';
import { PlaybackStatePersistenceService } from '@/features/playback/services/playback-state-persistence.service';
import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ZodTrack } from '@repo/contracts';
import { FileBucket } from '@repo/db';
import { DeleteLibraryTrackCommand } from '../impl/delete-library-track.command';

@CommandHandler(DeleteLibraryTrackCommand)
export class DeleteLibraryTrackHandler implements ICommandHandler<DeleteLibraryTrackCommand> {
  private readonly logger = new Logger(DeleteLibraryTrackHandler.name);

  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly trackRepository: TrackRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
    private readonly audioFileRepository: AudioFileRepository,
    private readonly storageService: StorageService,
    private readonly playbackStatePersistence: PlaybackStatePersistenceService,
    private readonly playbackGateway: PlaybackGateway,
  ) {}

  async execute(command: DeleteLibraryTrackCommand): Promise<ZodTrack> {
    const { id, userId } = command;

    const track = await this.trackRepository.getByIdForOwner(id, userId);

    if (!track) {
      throw new NotFoundException('Track not found or you do not have permission to delete it');
    }

    const audioFiles = await this.audioFileRepository.listByTrackId(id);

    await this.unitOfWork.runInTransaction(async () => {
      await this.trackRepository.softDelete(id);

      const libraryLinkIds = await this.libraryTrackRepository.listIdsByTrackAndUser(id, userId);
      await this.libraryTrackRepository.deleteMany(libraryLinkIds);

      for (const audioFile of audioFiles) {
        await this.audioFileRepository.delete(audioFile.id);
      }
    });

    for (const audioFile of audioFiles) {
      this.storageService.deleteFile(audioFile.bucket as FileBucket, audioFile.key).catch((err) => {
        this.logger.error(`Failed to cleanup audio file from S3: ${audioFile.key}`, err);
      });
    }

    try {
      const purge = await this.playbackStatePersistence.purgeDeletedLibraryTrack(userId, id);
      if (purge.kind === 'updated') {
        this.playbackGateway.emitPlaybackStateToUserRoom(userId, purge.state);
      } else if (purge.kind === 'removed') {
        this.playbackGateway.emitPlaybackSessionEndedToUserRoom(userId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        `Playback purge after track delete failed for user ${userId}: ${err.message}`,
      );
    }

    return track;
  }
}
