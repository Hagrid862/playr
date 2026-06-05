import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateLibraryHandler } from './commands/handlers/create-library.handler';
import { LibraryController } from './library.controller';
import { GetLibraryHandler } from './queries/handlers/get-library.handler';
import { GetLibraryStorageUsageHandler } from './queries/handlers/get-library-storage-usage.handler';

@Module({
  imports: [CqrsModule],
  controllers: [LibraryController],
  providers: [CreateLibraryHandler, GetLibraryHandler, GetLibraryStorageUsageHandler],
  exports: [],
})
export class LibraryModule {}
