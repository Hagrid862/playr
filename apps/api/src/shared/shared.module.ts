import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { UserRepository } from './repositories/user.repository';
import { EmailAddressRepository } from './repositories/email-address.repository';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [PrismaService, UserRepository, EmailAddressRepository],
  exports: [PrismaService, UserRepository, EmailAddressRepository],
})
export class SharedModule {}
