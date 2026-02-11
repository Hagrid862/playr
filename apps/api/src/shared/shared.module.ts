import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ArtistRepository } from './repositories/artist.repository';
import { EmailAddressRepository } from './repositories/email-address.repository';
import { LibraryArtistRepository } from './repositories/library-artist.repository';
import { LibraryRepository } from './repositories/library.repository';
import { PrivateProfileRepository } from './repositories/private-profile.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { SessionRepository } from './repositories/session.repository';
import { UserRepository } from './repositories/user.repository';
import { HashingService } from './services/hashing.service';
import { ImageService } from './services/image.service';
import { PrismaService } from './services/prisma.service';
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
    // Repositories
    UserRepository,
    EmailAddressRepository,
    SessionRepository,
    RefreshTokenRepository,
    LibraryRepository,
    PrivateProfileRepository,
    ArtistRepository,
    LibraryArtistRepository,
    // guards
    JwtAuthGuard,
  ],
  exports: [
    // Services
    PrismaService,
    HashingService,
    UnitOfWorkService,
    ImageService,
    // Repositories
    UserRepository,
    EmailAddressRepository,
    SessionRepository,
    RefreshTokenRepository,
    LibraryRepository,
    PrivateProfileRepository,
    ArtistRepository,
    LibraryArtistRepository,
    // guards
    JwtAuthGuard,
  ],
})
export class SharedModule {}
