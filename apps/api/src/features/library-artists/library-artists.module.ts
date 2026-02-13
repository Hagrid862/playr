import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateLibraryArtistHandler } from './commands/handlers/create-library-artist.handler';
import { DeleteLibraryArtistHandler } from './commands/handlers/delete-library-artist.handler';
import { UpdateLibraryArtistHandler } from './commands/handlers/update-library-artist.handler';
import { UploadLibraryArtistAvatarHandler } from './commands/handlers/upload-library-artist-avatar.handler';
import { UploadLibraryArtistBannerHandler } from './commands/handlers/upload-library-artist-banner.handler';
import { LibraryArtistsController } from './library-artists.controller';
import { GetLibraryArtistHandler } from './queries/handlers/get-library-artist.handler';
import { GetLibraryArtistsHandler } from './queries/handlers/get-library-artists.handler';

@Module({
  imports: [CqrsModule],
  controllers: [LibraryArtistsController],
  providers: [
    GetLibraryArtistHandler,
    GetLibraryArtistsHandler,
    CreateLibraryArtistHandler,
    DeleteLibraryArtistHandler,
    UpdateLibraryArtistHandler,
    UploadLibraryArtistAvatarHandler,
    UploadLibraryArtistBannerHandler,
  ],
  exports: [],
})
export class LibraryArtistsModule {}
