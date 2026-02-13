import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { CreateLibraryArtistCommand } from '../impl/create-library-artist.command';

@CommandHandler(CreateLibraryArtistCommand)
export class CreateLibraryArtistHandler implements ICommandHandler<CreateLibraryArtistCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly artistRepository: ArtistRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryArtistRepository: LibraryArtistRepository,
  ) {}

  async execute(command: CreateLibraryArtistCommand): Promise<ZodArtist> {
    const { request, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const artist = await this.unitOfWork.runInTransaction(async () => {
      const existingArtist = await this.artistRepository.findOne({
        name: request.name,
        access: { some: { userId, role: 'OWNER' } },
      });

      if (existingArtist) {
        throw new ConflictException('This artist name is already taken');
      }

      const created = await this.artistRepository.create({
        name: request.name,
        description: request.description,
        visibility: 'PRIVATE',
        access: {
          create: {
            userId: userId,
            role: 'OWNER',
          },
        },
      });

      await this.libraryArtistRepository.create({
        artist: { connect: { id: created.id } },
        library: { connect: { id: library.id } },
      });

      return created;
    });

    const parsed = ArtistSchema.safeParse(artist);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse artist');
    }

    return parsed.data;
  }
}
