import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { UpdateArtistCommand } from '../impl/update-artist.command';

@CommandHandler(UpdateArtistCommand)
export class UpdateArtistHandler implements ICommandHandler<UpdateArtistCommand> {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly privateProfileRepository: PrivateProfileRepository,
  ) {}

  async execute(command: UpdateArtistCommand): Promise<ZodArtist> {
    const { artistId, request, userId } = command;

    const userPrivateProfile = await this.privateProfileRepository.getByUserId(userId);

    if (!userPrivateProfile) {
      throw new PreconditionFailedException('User private profile not found');
    }

    const artist = await this.artistRepository.getById(artistId);

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (request.name && request.name !== artist.name) {
      const existingArtistWithName = await this.artistRepository.getByNameAndOwnerId(
        request.name,
        userPrivateProfile.id,
      );

      if (existingArtistWithName) {
        throw new ConflictException('This artist name is already taken');
      }
    }

    const updatedArtist = await this.artistRepository.update(artistId, {
      name: request.name,
      description: request.description,
    });

    const parsed = ArtistSchema.safeParse(updatedArtist);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse updated artist');
    }

    return parsed.data;
  }
}
