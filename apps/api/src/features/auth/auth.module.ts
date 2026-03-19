import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/handlers/login.handler';
import { LogoutHandler } from './commands/handlers/logout.handler';
import { RefreshTokensHandler } from './commands/handlers/refresh-tokens.handler';
import { RegisterHandler } from './commands/handlers/register.handler';
import { ValidateUserHandler } from './queries/handlers/validate-user.handler';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { OtpCodeService } from './services/otp-code.service';

@Module({
  imports: [CqrsModule, PassportModule],
  controllers: [AuthController],
  providers: [
    RegisterHandler,
    LoginHandler,
    RefreshTokensHandler,
    LogoutHandler,
    TokenService,
    LocalStrategy,
    JwtStrategy,
    ValidateUserHandler,
    OtpCodeService,
  ],
  exports: [TokenService],
})
export class AuthModule {}
