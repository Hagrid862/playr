import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { RegisterHandler } from './commands/handlers/register.handler';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [RegisterHandler],
  exports: [],
})
export class AuthModule {}
