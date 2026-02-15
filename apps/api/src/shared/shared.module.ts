import { Global, Module } from '@nestjs/common';
import { AlbumAccessGuard } from './guards/album-access.guard';
import { ArtistAccessGuard } from './guards/artist-access.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TrackAccessGuard } from './guards/track-access.guard';
import { AlbumRepository } from './repositories/album.repository';
import { ArtistRepository } from './repositories/artist.repository';
import { EmailAddressRepository } from './repositories/email-address.repository';
import { LibraryAlbumRepository } from './repositories/library-album.repository';
import { LibraryArtistRepository } from './repositories/library-artist.repository';
import { LibraryTrackRepository } from './repositories/library-track.repository';

import { LibraryRepository } from './repositories/library.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { SessionRepository } from './repositories/session.repository';
import { TrackRepository } from './repositories/track.repository';
import { UserRepository } from './repositories/user.repository';
import { HashingService } from './services/hashing.service';
import { ImageService } from './services/image.service';
import { PrismaService } from './services/prisma.service';
import { StorageService } from './services/storage.service';
import { UnitOfWorkService } from './services/unit-of-work.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    // Services
    PrismaService,
    HashingService,
    UnitOfWorkService,
    ImageService,
    StorageService,
    // Repositories
    UserRepository,
    EmailAddressRepository,
    SessionRepository,
    RefreshTokenRepository,
    LibraryRepository,
    ArtistRepository,
    AlbumRepository,
    LibraryArtistRepository,
    LibraryAlbumRepository,
    LibraryTrackRepository,
    TrackRepository,
    // guards
    JwtAuthGuard,
    AlbumAccessGuard,
    ArtistAccessGuard,
    TrackAccessGuard,
  ],
  exports: [
    // Services
    PrismaService,
    HashingService,
    UnitOfWorkService,
    ImageService,
    StorageService,
    // Repositories
    UserRepository,
    EmailAddressRepository,
    SessionRepository,
    RefreshTokenRepository,
    LibraryRepository,
    ArtistRepository,
    AlbumRepository,
    LibraryArtistRepository,
    LibraryAlbumRepository,
    LibraryTrackRepository,
    TrackRepository,
    // guards
    JwtAuthGuard,
    AlbumAccessGuard,
    ArtistAccessGuard,
    TrackAccessGuard,
  ],
})
export class SharedModule {}
