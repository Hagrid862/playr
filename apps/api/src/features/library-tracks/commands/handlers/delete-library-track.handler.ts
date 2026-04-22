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
  ) {}

  async execute(command: DeleteLibraryTrackCommand): Promise<ZodTrack> {
    const { id, userId } = command;

    const track = await this.trackRepository.findOne({
      id,
      access: { some: { userId, role: 'owner' } },
    });

    if (!track) {
      throw new NotFoundException('Track not found or you do not have permission to delete it');
    }

    const audioFiles = await this.audioFileRepository.findMany({ trackId: id }, {});

    await this.unitOfWork.runInTransaction(async () => {
      // Soft delete the track
      await this.trackRepository.update(id, {
        deletedAt: new Date(),
      });

      // Remove from all users libraries?
      // Usually library_tracks is per user. If owner deletes, maybe it should be gone from their library.
      await this.libraryTrackRepository.deleteMany({
        trackId: id,
        library: { userId },
      });

      for (const audioFile of audioFiles) {
        await this.audioFileRepository.delete(audioFile.id);
      }
    });

    for (const audioFile of audioFiles) {
      this.storageService.deleteFile(audioFile.bucket as FileBucket, audioFile.key).catch((err) => {
        this.logger.error(`Failed to cleanup audio file from S3: ${audioFile.key}`, err);
      });
    }

    return track;
  }
}
