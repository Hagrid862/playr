import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { InternalServerErrorException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletedGenreSchema, type ZodDeletedGenre } from '@repo/contracts';
import { DeleteLibraryGenreCommand } from '../impl/delete-library-genre.command';

@CommandHandler(DeleteLibraryGenreCommand)
export class DeleteLibraryGenreHandler implements ICommandHandler<DeleteLibraryGenreCommand> {
  constructor(
    private readonly genreRepository: GenreRepository,
    private readonly genreResolution: GenreResolutionService,
  ) {}

  async execute(command: DeleteLibraryGenreCommand): Promise<ZodDeletedGenre> {
    const { genreId, userId } = command;

    await this.genreResolution.assertEditableCustomGenreForUser(
      genreId,
      userId,
      'Only custom genres in your library can be deleted',
    );

    const deleted = await this.genreRepository.softDelete(genreId);

    const parsed = DeletedGenreSchema.safeParse({ id: deleted.id });

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse genre');
    }

    return parsed.data;
  }
}
