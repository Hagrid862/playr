import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GenreSchema, type ZodGenre } from '@repo/contracts';
import { UpdateLibraryGenreCommand } from '../impl/update-library-genre.command';

@CommandHandler(UpdateLibraryGenreCommand)
export class UpdateLibraryGenreHandler implements ICommandHandler<UpdateLibraryGenreCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(command: UpdateLibraryGenreCommand): Promise<ZodGenre> {
    const { genreId, request, userId } = command;

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
      throw new ForbiddenException('Only custom genres in your library can be updated');
    }

    if (request.name === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.genreRepository.update(genreId, {
      name: request.name,
    });

    const parsed = GenreSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse genre');
    }

    return parsed.data;
  }
}
