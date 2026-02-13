import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { UpdateLibraryArtistCommand } from '../impl/update-library-artist.command';

@CommandHandler(UpdateLibraryArtistCommand)
export class UpdateLibraryArtistHandler implements ICommandHandler<UpdateLibraryArtistCommand> {
  constructor(private readonly artistRepository: ArtistRepository) {}

  async execute(command: UpdateLibraryArtistCommand): Promise<ZodArtist> {
    const { artistId, request, userId } = command;

    const artist = await this.artistRepository.findOne({
      id: artistId,
      access: { some: { userId, role: 'OWNER' } },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (request.name && request.name !== artist.name) {
      const existingArtistWithName = await this.artistRepository.findOne({
        name: request.name,
        access: { some: { userId, role: 'OWNER' } },
      });

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
