import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { InternalServerErrorException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GenreSchema, type ZodGenre } from '@repo/contracts';
import { UpdateLibraryGenreCommand } from '../impl/update-library-genre.command';

@CommandHandler(UpdateLibraryGenreCommand)
export class UpdateLibraryGenreHandler implements ICommandHandler<UpdateLibraryGenreCommand> {
  constructor(
    private readonly genreRepository: GenreRepository,
    private readonly genreResolution: GenreResolutionService,
  ) {}

  async execute(command: UpdateLibraryGenreCommand): Promise<ZodGenre> {
    const { genreId, request, userId } = command;

    const existing = await this.genreResolution.assertEditableCustomGenreForUser(
      genreId,
      userId,
      'Only custom genres in your library can be updated',
    );

    const name = request.name!;
    const slug = await this.genreResolution.allocateUniqueSlugForLibraryRename(
      existing.libraryId!,
      name,
      existing.id,
    );

    const updated = await this.genreRepository.update(genreId, {
      name,
      slug,
    });

    const parsed = GenreSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse genre');
    }

    return parsed.data;
  }
}
