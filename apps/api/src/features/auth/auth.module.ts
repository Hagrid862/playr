import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/handlers/login.handler';
import { LogoutHandler } from './commands/handlers/logout.handler';
import { RefreshTokensHandler } from './commands/handlers/refresh-tokens.handler';
import { RegisterHandler } from './commands/handlers/register.handler';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ValidateUserHandler } from './queries/handlers/validate-user.handler';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { OtpCodeService } from './services/otp-code.service';
import { EmailAuthService } from './services/email-auth.service';
import { VerifyEmailHandler } from '@/features/auth/commands/handlers/verify-email.handler';
import { ResendEmailVerificationCodeHandler } from '@/features/auth/commands/handlers/resend-email-verification-code.handler';
import { ForgotPasswordHandler } from '@/features/auth/commands/handlers/forgot-password.handler';
import { RecoverPasswordHandler } from '@/features/auth/commands/handlers/recover-password.handler';

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
    EmailAuthService,
    VerifyEmailHandler,
    ResendEmailVerificationCodeHandler,
    ForgotPasswordHandler,
    RecoverPasswordHandler,
    WsJwtGuard,
  ],
  exports: [TokenService, WsJwtGuard],
})
export class AuthModule {}
