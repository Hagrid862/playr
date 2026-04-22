import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { InternalServerErrorException, Logger, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GenreSchema, type ZodGenre } from '@repo/contracts';
import { CreateLibraryGenreCommand } from '../impl/create-library-genre.command';

@CommandHandler(CreateLibraryGenreCommand)
export class CreateLibraryGenreHandler implements ICommandHandler<CreateLibraryGenreCommand> {
  private readonly logger = new Logger(CreateLibraryGenreHandler.name);

  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly genreResolution: GenreResolutionService,
  ) {}

  async execute(command: CreateLibraryGenreCommand): Promise<ZodGenre> {
    const { request, userId } = command;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const created = await this.genreResolution.ensureCustomGenre(library.id, request.name);

    const parsed = GenreSchema.safeParse(created);

    if (!parsed.success) {
      this.logger.error(parsed.error);
      throw new InternalServerErrorException('Failed to parse genre');
    }

    return parsed.data;
  }
}
