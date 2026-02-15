import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { InternalServerErrorException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { CreateLibraryTrackCommand } from '../impl/create-library-track.command';

@CommandHandler(CreateLibraryTrackCommand)
export class CreateLibraryTrackHandler implements ICommandHandler<CreateLibraryTrackCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly libraryRepository: LibraryRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(command: CreateLibraryTrackCommand): Promise<ZodTrack> {
    const { body, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const album = await this.albumRepository.findOne({ id: body.albumId });
    if (!album) {
      throw new PreconditionFailedException('Album not found');
    }

    const track = await this.unitOfWork.runInTransaction(async () => {
      const created = await this.trackRepository.create({
        title: body.title,
        trackNumber: body.trackNumber,
        diskNumber: body.diskNumber,
        duration: body.duration,
        explicit: body.explicit,
        lyrics: body.lyrics,
        visibility: body.visibility as any,
        album: {
          connect: {
            id: body.albumId,
          },
        },
        artists: {
          connect: body.artistIds.map((id) => ({ id })),
        },
        access: {
          create: {
            userId: userId,
            role: 'owner',
          },
        },
      });

      await this.libraryTrackRepository.create({
        track: { connect: { id: created.id } },
        library: { connect: { id: library.id } },
      });

      return created;
    });

    const parsed = TrackSchema.safeParse(track);

    if (!parsed.success) {
      console.error(parsed.error);
      throw new InternalServerErrorException('Failed to parse track');
    }

    return parsed.data;
  }
}
