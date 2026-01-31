import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './auth.controller';
import { RegisterHandler } from './commands/handlers/register.handler';

@Module({
  imports: [CqrsModule],
  controllers: [AuthController],
  providers: [RegisterHandler],
  exports: [],
})
export class AuthModule {}
