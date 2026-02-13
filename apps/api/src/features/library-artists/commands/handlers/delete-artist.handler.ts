import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { DeleteArtistCommand } from '../impl/delete-artist.command';

@CommandHandler(DeleteArtistCommand)
export class DeleteArtistHandler implements ICommandHandler<DeleteArtistCommand> {
  constructor(private readonly artistRepository: ArtistRepository) {}

  async execute(command: DeleteArtistCommand): Promise<ZodArtist> {
    const { artistId, userId } = command;

    const artist = await this.artistRepository.findOne({
      id: artistId,
      access: { some: { userId, role: 'OWNER' } },
    });

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
