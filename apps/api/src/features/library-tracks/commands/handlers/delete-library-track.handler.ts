import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteLibraryTrackCommand } from '../impl/delete-library-track.command';

@CommandHandler(DeleteLibraryTrackCommand)
export class DeleteLibraryTrackHandler implements ICommandHandler<DeleteLibraryTrackCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly trackRepository: TrackRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(command: DeleteLibraryTrackCommand): Promise<{ success: boolean }> {
    const { id, userId } = command;

    const track = await this.trackRepository.findOne({
      id,
      access: { some: { userId, role: 'owner' } },
    });

    if (!track) {
      throw new NotFoundException('Track not found or you do not have permission to delete it');
    }

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
    });

    return { success: true };
  }
}
