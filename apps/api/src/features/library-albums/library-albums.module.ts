import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateAlbumHandler } from './commands/handlers/create-album.handler';
import { DeleteAlbumHandler } from './commands/handlers/delete-album.handler';
import { UpdateAlbumHandler } from './commands/handlers/update-album.handler';
import { UploadAlbumCoverHandler } from './commands/handlers/upload-album-cover.handler';
import { AlbumsController } from './library-albums.controller';
import { GetAlbumHandler } from './queries/handlers/get-album.handler';

@Module({
  imports: [CqrsModule],
  controllers: [AlbumsController],
  providers: [
    CreateAlbumHandler,
    UpdateAlbumHandler,
    DeleteAlbumHandler,
    GetAlbumHandler,
    UploadAlbumCoverHandler,
  ],

  exports: [],
})
export class AlbumsModule {}
