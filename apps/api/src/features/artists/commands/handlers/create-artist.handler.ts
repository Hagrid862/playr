import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
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
    private readonly artistRepository: ArtistRepository,
    private readonly privateProfileRepository: PrivateProfileRepository,
  ) { }

  async execute(command: CreateArtistCommand): Promise<ZodArtist> {
    const { request, userId } = command;

    const userPrivateProfile = await this.privateProfileRepository.getByUserId(userId);

    if (!userPrivateProfile) {
      throw new PreconditionFailedException('User private profile not found');
    }

    console.log(request.name);

    const existingArtist = await this.artistRepository.getByNameAndOwnerId(
      request.name,
      userPrivateProfile.id,
    );

    if (existingArtist) {
      throw new ConflictException('This artist name is already taken');
    }

    const artist = await this.artistRepository.create({
      name: request.name,
      description: request.description,
      privateArtistProfile: {
        create: {
          userPrivateProfileId: userPrivateProfile.id,
        },
      },
    });

    const parsed = ArtistSchema.safeParse(artist);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse artist');
    }

    return parsed.data;
  }
}
