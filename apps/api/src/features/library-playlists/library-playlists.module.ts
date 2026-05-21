import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AddPlaylistAlbumHandler } from './commands/handlers/add-playlist-album.handler';
import { AddPlaylistTrackHandler } from './commands/handlers/add-playlist-track.handler';
import { CreateLibraryPlaylistHandler } from './commands/handlers/create-library-playlist.handler';
import { DeleteLibraryPlaylistCoverHandler } from './commands/handlers/delete-library-playlist-cover.handler';
import { DeleteLibraryPlaylistHandler } from './commands/handlers/delete-library-playlist.handler';
import { PinPlaylistHandler } from './commands/handlers/pin-playlist.handler';
import { RemovePlaylistTrackHandler } from './commands/handlers/remove-playlist-track.handler';
import { ReorderPlaylistPinsHandler } from './commands/handlers/reorder-playlist-pins.handler';
import { ReorderPlaylistTracksHandler } from './commands/handlers/reorder-playlist-tracks.handler';
import { SortPlaylistTracksHandler } from './commands/handlers/sort-playlist-tracks.handler';
import { UnpinPlaylistHandler } from './commands/handlers/unpin-playlist.handler';
import { UpdateLibraryPlaylistHandler } from './commands/handlers/update-library-playlist.handler';
import { UploadLibraryPlaylistCoverHandler } from './commands/handlers/upload-library-playlist-cover.handler';
import { LibraryPlaylistPinsController } from './library-playlist-pins.controller';
import { LibraryPlaylistsController } from './library-playlists.controller';
import { GetLibraryPlaylistDetailHandler } from './queries/handlers/get-library-playlist-detail.handler';
import { GetLibraryPlaylistPinsHandler } from './queries/handlers/get-library-playlist-pins.handler';
import { GetLibraryPlaylistsHandler } from './queries/handlers/get-library-playlists.handler';

const CommandHandlers = [
  CreateLibraryPlaylistHandler,
  UpdateLibraryPlaylistHandler,
  UploadLibraryPlaylistCoverHandler,
  DeleteLibraryPlaylistCoverHandler,
  DeleteLibraryPlaylistHandler,
  AddPlaylistAlbumHandler,
  AddPlaylistTrackHandler,
  RemovePlaylistTrackHandler,
  ReorderPlaylistTracksHandler,
  SortPlaylistTracksHandler,
  PinPlaylistHandler,
  UnpinPlaylistHandler,
  ReorderPlaylistPinsHandler,
];

const QueryHandlers = [
  GetLibraryPlaylistsHandler,
  GetLibraryPlaylistDetailHandler,
  GetLibraryPlaylistPinsHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [LibraryPlaylistsController, LibraryPlaylistPinsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class LibraryPlaylistsModule {}
