import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GenreSchema, type ZodGenre } from '@repo/contracts';
import { DeleteLibraryGenreCommand } from '../impl/delete-library-genre.command';

@CommandHandler(DeleteLibraryGenreCommand)
export class DeleteLibraryGenreHandler implements ICommandHandler<DeleteLibraryGenreCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(command: DeleteLibraryGenreCommand): Promise<ZodGenre> {
    const { genreId, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const existing = await this.genreRepository.findOne({
      id: genreId,
      deletedAt: null,
    });

    if (!existing) {
      throw new NotFoundException('Genre not found');
    }

    if (existing.kind !== 'custom' || existing.libraryId !== library.id) {
      throw new ForbiddenException('Only custom genres in your library can be deleted');
    }

    const deleted = await this.genreRepository.delete(genreId);

    const parsed = GenreSchema.safeParse(deleted);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse genre');
    }

    return parsed.data;
  }
}
