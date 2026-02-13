import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import {
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { DeleteArtistCommand } from '../impl/delete-artist.command';

@CommandHandler(DeleteArtistCommand)
export class DeleteArtistHandler implements ICommandHandler<DeleteArtistCommand> {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly privateProfileRepository: PrivateProfileRepository,
  ) {}

  async execute(command: DeleteArtistCommand): Promise<ZodArtist> {
    const { artistId, userId } = command;

    const userPrivateProfile = await this.privateProfileRepository.getByUserId(userId);

    if (!userPrivateProfile) {
      throw new PreconditionFailedException('User private profile not found');
    }

    const artist = await this.artistRepository.getByIdAndOwnerId(artistId, userPrivateProfile.id);

    if (!artist) {
      throw new NotFoundException('Artist not found or you do not have permission to delete it');
    }

    // SOFT DELETE
    const deletedArtist = await this.artistRepository.update(artistId, {
      deletedAt: new Date(),
    });

    const parsed = ArtistSchema.safeParse(deletedArtist);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse deleted artist');
    }

    return parsed.data;
  }
}
