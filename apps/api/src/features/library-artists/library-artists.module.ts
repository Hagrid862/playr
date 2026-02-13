import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateArtistHandler } from './commands/handlers/create-artist.handler';
import { DeleteArtistHandler } from './commands/handlers/delete-artist.handler';
import { UpdateArtistHandler } from './commands/handlers/update-artist.handler';
import { UploadArtistAvatarHandler } from './commands/handlers/upload-artist-avatar.handler';
import { UploadArtistBannerHandler } from './commands/handlers/upload-artist-banner.handler';
import { LibraryArtistsController } from './library-artists.controller';
import { GetLibraryArtistHandler } from './queries/handlers/get-library-artist.handler';
import { GetLibraryArtistsHandler } from './queries/handlers/get-library-artists.handler';

@Module({
  imports: [CqrsModule],
  controllers: [LibraryArtistsController],
  providers: [
    GetLibraryArtistHandler,
    GetLibraryArtistsHandler,
    CreateArtistHandler,
    DeleteArtistHandler,
    UpdateArtistHandler,
    UploadArtistAvatarHandler,
    UploadArtistBannerHandler,
  ],
  exports: [],
})
export class LibraryArtistsModule {}
