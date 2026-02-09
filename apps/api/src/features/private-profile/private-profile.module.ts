import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreatePrivateProfileHandler } from './commands/handlers/create-private-profile.handler';
import { PrivateProfileController } from './private-profile.controller';
import { GetPrivateProfileHandler } from './queries/handlers/get-private-profile.handler';

@Module({
  imports: [CqrsModule],
  controllers: [PrivateProfileController],
  providers: [CreatePrivateProfileHandler, GetPrivateProfileHandler],
  exports: [],
})
export class PrivateProfileModule {}
