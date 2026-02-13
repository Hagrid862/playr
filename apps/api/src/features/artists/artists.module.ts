import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ArtistsController } from './artists.controller';
import { CreateArtistHandler } from './commands/handlers/create-artist.handler';
import { DeleteArtistHandler } from './commands/handlers/delete-artist.handler';
import { UpdateArtistHandler } from './commands/handlers/update-artist.handler';
import { UploadArtistAvatarHandler } from './commands/handlers/upload-artist-avatar.handler';
import { UploadArtistBannerHandler } from './commands/handlers/upload-artist-banner.handler';
import { GetPrivateArtistsHandler } from './queries/handlers/get-private-artists.handler';

@Module({
  imports: [CqrsModule],
  controllers: [ArtistsController],
  providers: [
    CreateArtistHandler,
    UpdateArtistHandler,
    DeleteArtistHandler,
    UploadArtistAvatarHandler,
    UploadArtistBannerHandler,
    GetPrivateArtistsHandler,
    ArtistRepository,
    PrivateProfileRepository,
  ],
  exports: [],
})
export class ArtistsModule {}
