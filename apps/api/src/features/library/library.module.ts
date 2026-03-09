import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateLibraryHandler } from './commands/handlers/create-library.handler';
import { LibraryController } from './library.controller';
import { GetLibraryAlbumsHandler } from './queries/handlers/get-library-albums.handler';
import { GetLibraryHandler } from './queries/handlers/get-library.handler';

@Module({
  imports: [CqrsModule],
  controllers: [LibraryController],
  providers: [CreateLibraryHandler, GetLibraryHandler, GetLibraryAlbumsHandler],
  exports: [],
})
export class LibraryModule {}
