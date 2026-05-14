import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { DeleteLibraryArtistCommand } from '../impl/delete-library-artist.command';

@CommandHandler(DeleteLibraryArtistCommand)
export class DeleteLibraryArtistHandler implements ICommandHandler<DeleteLibraryArtistCommand> {
  constructor(private readonly artistRepository: ArtistRepository) {}

  async execute(command: DeleteLibraryArtistCommand): Promise<ZodArtist> {
    const { artistId, userId } = command;

    const artist = await this.artistRepository.getByIdForOwner(artistId, userId);

    if (!artist) {
      throw new NotFoundException('Artist not found or you do not have permission to delete it');
    }

    try {
      const deletedArtist = await this.artistRepository.softDeleteCascade(artistId);

      const parsed = ArtistSchema.safeParse(deletedArtist);

      if (!parsed.success) {
        throw new InternalServerErrorException('Failed to parse deleted artist');
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to delete artist:', error);
      throw new InternalServerErrorException('Failed to delete artist');
    }
  }
}
