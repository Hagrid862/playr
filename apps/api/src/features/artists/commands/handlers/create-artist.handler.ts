import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { CreateArtistCommand } from '../impl/create-artist.command';

@CommandHandler(CreateArtistCommand)
export class CreateArtistHandler implements ICommandHandler<CreateArtistCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly artistRepository: ArtistRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryArtistRepository: LibraryArtistRepository,
    private readonly privateProfileRepository: PrivateProfileRepository,
  ) {}

  async execute(command: CreateArtistCommand): Promise<ZodArtist> {
    const { request, userId } = command;

    const [userPrivateProfile, library] = await Promise.all([
      this.privateProfileRepository.getByUserId(userId),
      this.libraryRepository.getByUserId(userId),
    ]);

    if (!userPrivateProfile) {
      throw new PreconditionFailedException('User private profile not found');
    }

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const artist = await this.unitOfWork.runInTransaction(async () => {
      const existingArtist = await this.artistRepository.getByNameAndOwnerId(
        request.name,
        userPrivateProfile.id,
      );

      if (existingArtist) {
        throw new ConflictException('This artist name is already taken');
      }

      const created = await this.artistRepository.create({
        name: request.name,
        description: request.description,
        privateArtistProfile: {
          create: {
            userPrivateProfileId: userPrivateProfile.id,
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
