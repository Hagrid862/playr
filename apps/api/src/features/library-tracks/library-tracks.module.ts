import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateLibraryTrackHandler } from './commands/handlers/create-library-track.handler';
import { DeleteLibraryTrackHandler } from './commands/handlers/delete-library-track.handler';
import { UpdateLibraryTrackHandler } from './commands/handlers/update-library-track.handler';
import { LibraryTracksController } from './library-tracks.controller';
import { GetLibraryTrackHandler } from './queries/handlers/get-library-track.handler';
import { GetLibraryTracksHandler } from './queries/handlers/get-library-tracks.handler';

export const CommandHandlers = [
  CreateLibraryTrackHandler,
  UpdateLibraryTrackHandler,
  DeleteLibraryTrackHandler,
];

export const QueryHandlers = [GetLibraryTrackHandler, GetLibraryTracksHandler];

@Module({
  imports: [CqrsModule],
  controllers: [LibraryTracksController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class LibraryTracksModule {}
