import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateLibraryAlbumHandler } from './commands/handlers/create-library-album.handler';
import { DeleteLibraryAlbumHandler } from './commands/handlers/delete-library-album.handler';
import { UpdateLibraryAlbumHandler } from './commands/handlers/update-library-album.handler';
import { UploadLibraryAlbumCoverHandler } from './commands/handlers/upload-library-album-cover.handler';
import { AlbumsController } from './library-albums.controller';
import { GetLibraryAlbumHandler } from './queries/handlers/get-library-album.handler';
import { GetLibraryAlbumsHandler } from './queries/handlers/get-library-albums.handler';
import { GetLibraryAlbumTracksHandler } from './queries/handlers/get-library-album-tracks.handler';

@Module({
  imports: [CqrsModule],
  controllers: [AlbumsController],
  providers: [
    CreateLibraryAlbumHandler,
    UpdateLibraryAlbumHandler,
    DeleteLibraryAlbumHandler,
    GetLibraryAlbumHandler,
    GetLibraryAlbumsHandler,
    GetLibraryAlbumTracksHandler,
    UploadLibraryAlbumCoverHandler,
  ],

  exports: [],
})
export class AlbumsModule {}
