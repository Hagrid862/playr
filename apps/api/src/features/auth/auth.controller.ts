import { AuthenticatedUser } from '@/common/types/auth.types';
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  Response,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ApiErrorResponseDto } from '../../common/dto/api-error.response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { LoginCommand } from './commands/impl/login.command';
import { LogoutCommand } from './commands/impl/logout.command';
import { RefreshTokensCommand } from './commands/impl/refresh-tokens.command';
import { RegisterCommand } from './commands/impl/register.command';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from './constants/cookie.constants';
import { LoginRequestDto } from './dto/login.request.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { LogoutResponseDto } from './dto/logout.response.dto';
import { RefreshResponseDto } from './dto/refresh.response.dto';
import { RegisterRequestDto } from './dto/register.request.dto';
import { RegisterResponseDto } from './dto/register.response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshTokenInterceptor } from './interceptors/refresh-token.interceptor';
import { VerifyEmailResponseDto } from '@/features/auth/dto/verify-email.response.dto';
import { VerifyEmailCommand } from '@/features/auth/commands/impl/verify-email.command';
import { VerifyEmailRequestDto } from '@/features/auth/dto/verify-email.request.dto';
import { ResendEmailVerificationCodeResponseDto } from '@/features/auth/dto/resend-email-verification-code.response.dto';
import { ResendEmailVerificationCodeRequestDto } from '@/features/auth/dto/resend-email-verification-code.request.dto';
import { ResendEmailVerificationCodeCommand } from '@/features/auth/commands/impl/resend-email-verification-code.command';
import {ForgotPasswordResponseDto} from "@/features/auth/dto/forgot-password.response.dto";
import {ForgotPasswordRequestDto} from "@/features/auth/dto/forgot-password.request.dto";
import {ForgotPasswordCommand} from "@/features/auth/commands/impl/forgot-password.command";
import {RecoverPasswordResponseDto} from "@/features/auth/dto/recover-password.response.dto";
import {RecoverPasswordRequestDto} from "@/features/auth/dto/recover-password.request.dto";
import {RecoverPasswordCommand} from "@/features/auth/commands/impl/recover-password.command";

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@UseInterceptors(RefreshTokenInterceptor)
export class AuthController {
  constructor(
    private commandBus: CommandBus,
    private config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already taken',
    type: ApiErrorResponseDto,
  })
  register(@Body() body: RegisterRequestDto) {
    return this.commandBus.execute(new RegisterCommand(body));
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    type: ApiErrorResponseDto,
  })
  async login(@Request() req: ExpressRequest & { user: AuthenticatedUser }) {
    return this.commandBus.execute(new LoginCommand(req.user.user, !!req.user.isEmailVerified));
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Log out the user' })
  @ApiResponse({
    status: 204,
    description: 'User logged out successfully',
    type: LogoutResponseDto,
  })
  async logout(
    @Request() req: ExpressRequest & { user: AuthenticatedUser },
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    if (req.user.sessionId) {
      await this.commandBus.execute(new LogoutCommand(req.user.sessionId));
    }
    const cookieOpts = {
      sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
      secure: this.config.get('NODE_ENV') === 'production',
    };
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...cookieOpts, path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...cookieOpts, path: '/auth/refresh' });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    type: ApiErrorResponseDto,
  })
  async refresh(@Request() req: ExpressRequest) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    return this.commandBus.execute(new RefreshTokensCommand(refreshToken));
  }

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email address verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email address not found or User not found for that email address',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP code',
    type: ApiErrorResponseDto,
  })
  async verifyEmail(@Body() body: VerifyEmailRequestDto) {
    return this.commandBus.execute(new VerifyEmailCommand(body));
  }

  @Post('resend-email-verification-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiResponse({
    status: 200,
    description: 'Email verification code resented successfully',
    type: ResendEmailVerificationCodeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email not found or already verified',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send verification email',
    type: ApiErrorResponseDto,
  })
  async resendEmailVerification(@Body() body: ResendEmailVerificationCodeRequestDto) {
    return this.commandBus.execute(new ResendEmailVerificationCodeCommand(body));
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'send password retrieval code via email'})
  @ApiResponse({
    status: 200,
    description: 'password retrieval code sent successfully',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send email for password retrieval',
    type: ApiErrorResponseDto,
  })
  async forgotPassword(@Body() body: ForgotPasswordRequestDto) {
    return this.commandBus.execute(new ForgotPasswordCommand(body));
  }

  @Post('recover-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'finish password retrieval process by changing password'})
  @ApiResponse({
    status: 200,
    description: 'password changed successfully',
    type: RecoverPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email not found or Invalid or expired OTP code',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to update user password',
    type: ApiErrorResponseDto,
  })
  async recoverPassword(@Body() body: RecoverPasswordRequestDto) {
    return this.commandBus.execute(new RecoverPasswordCommand(body));
  }

}
