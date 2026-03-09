import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AudioProcessingModule } from '../audio-processing/audio-processing.module';
import { CreateLibraryTrackHandler } from './commands/handlers/create-library-track.handler';
import { DeleteLibraryTrackHandler } from './commands/handlers/delete-library-track.handler';
import { UpdateLibraryTrackHandler } from './commands/handlers/update-library-track.handler';
import { UploadTrackAudioHandler } from './commands/handlers/upload-track-audio.handler';
import { LibraryTracksController } from './library-tracks.controller';
import { GetLibraryTrackHandler } from './queries/handlers/get-library-track.handler';
import { GetLibraryTracksHandler } from './queries/handlers/get-library-tracks.handler';
import { GetTrackStreamHandler } from './queries/handlers/get-track-stream.handler';
import { GetTrackStreamQualitiesHandler } from './queries/handlers/get-track-stream-qualities.handler';

export const CommandHandlers = [
  CreateLibraryTrackHandler,
  UpdateLibraryTrackHandler,
  DeleteLibraryTrackHandler,
  UploadTrackAudioHandler,
];

export const QueryHandlers = [
  GetLibraryTrackHandler,
  GetLibraryTracksHandler,
  GetTrackStreamHandler,
  GetTrackStreamQualitiesHandler,
];

@Module({
  imports: [CqrsModule, AudioProcessingModule],
  controllers: [LibraryTracksController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class LibraryTracksModule {}
