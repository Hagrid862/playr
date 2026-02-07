import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { HashingService } from './services/hashing.service';
import { UserRepository } from './repositories/user.repository';
import { EmailAddressRepository } from './repositories/email-address.repository';
import { SessionRepository } from './repositories/session.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
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
    // Repositories
    UserRepository,
    EmailAddressRepository,
    SessionRepository,
    RefreshTokenRepository,
  ],
  exports: [
    // Services
    PrismaService,
    HashingService,
    UnitOfWorkService,
    // Repositories
    UserRepository,
    EmailAddressRepository,
    SessionRepository,
    RefreshTokenRepository,
  ],
})
export class SharedModule {}
