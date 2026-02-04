import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { HashingService } from './services/hashing.service';
import { UserRepository } from './repositories/user.repository';
import { EmailAddressRepository } from './repositories/email-address.repository';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [PrismaService, HashingService, UserRepository, EmailAddressRepository],
  exports: [PrismaService, HashingService, UserRepository, EmailAddressRepository],
})
export class SharedModule {}
