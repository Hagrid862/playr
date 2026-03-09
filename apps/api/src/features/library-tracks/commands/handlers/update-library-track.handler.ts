import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { UpdateLibraryTrackCommand } from '../impl/update-library-track.command';

@CommandHandler(UpdateLibraryTrackCommand)
export class UpdateLibraryTrackHandler implements ICommandHandler<UpdateLibraryTrackCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly trackRepository: TrackRepository,
  ) {}

  async execute(command: UpdateLibraryTrackCommand): Promise<ZodTrack> {
    const { id, body, userId } = command;

    const track = await this.trackRepository.findOne({
      id,
      access: { some: { userId, role: 'owner' } },
    });

    if (!track) {
      throw new NotFoundException('Track not found or you do not have permission to update it');
    }

    const updated = await this.unitOfWork.runInTransaction(async () => {
      return await this.trackRepository.update(id, {
        title: body.title,
        trackNumber: body.trackNumber,
        diskNumber: body.diskNumber,
        duration: body.duration,
        explicit: body.explicit,
        lyrics: body.lyrics,
        visibility: body.visibility as any,
        artists: body.artistIds
          ? {
              set: body.artistIds.map((artistId) => ({ id: artistId })),
            }
          : undefined,
      });
    });

    const parsed = TrackSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse track');
    }

    return parsed.data;
  }
}
