import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateLibraryGenreHandler } from './commands/handlers/create-library-genre.handler';
import { DeleteLibraryGenreHandler } from './commands/handlers/delete-library-genre.handler';
import { UpdateLibraryGenreHandler } from './commands/handlers/update-library-genre.handler';
import { LibraryGenresController } from './library-genres.controller';
import { GetLibraryGenreHandler } from './queries/handlers/get-library-genre.handler';
import { GetLibraryGenresHandler } from './queries/handlers/get-library-genres.handler';

@Module({
  imports: [CqrsModule],
  controllers: [LibraryGenresController],
  providers: [
    GetLibraryGenresHandler,
    GetLibraryGenreHandler,
    CreateLibraryGenreHandler,
    UpdateLibraryGenreHandler,
    DeleteLibraryGenreHandler,
  ],
  exports: [],
})
export class LibraryGenresModule {}
