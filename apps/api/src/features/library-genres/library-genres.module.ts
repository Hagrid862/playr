import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LibraryGenresController } from './library-genres.controller';

@Module({
  imports: [CqrsModule],
  controllers: [LibraryGenresController],
  providers: [],
  exports: [],
})
export class LibraryGenresModule {}
