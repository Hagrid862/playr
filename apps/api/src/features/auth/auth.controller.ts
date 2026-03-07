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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { LoginResponseDto } from './dto/login.response.dto';
import { LogoutResponseDto } from './dto/logout.response.dto';
import { RefreshResponseDto } from './dto/refresh.response.dto';
import { RegisterRequestDto } from './dto/register.request.dto';
import { RegisterResponseDto } from './dto/register.response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshTokenInterceptor } from './interceptors/refresh-token.interceptor';

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
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
    type: ApiErrorResponseDto,
  })
  async login(@Request() req: ExpressRequest & { user: AuthenticatedUser }) {
    return this.commandBus.execute(new LoginCommand(req.user.user));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Logout a user' })
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
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: REFRESH_TOKEN_COOKIE_OPTIONS.path,
      sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
      secure: this.config.get('NODE_ENV') === 'production',
    });
  }

  @Post('refresh')
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
}
