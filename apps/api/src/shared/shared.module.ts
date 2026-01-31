import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma/prisma.service';
import { UserRepository } from './repositories/user.repository';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [PrismaService, UserRepository],
  exports: [PrismaService, UserRepository],
})
export class SharedModule {}
