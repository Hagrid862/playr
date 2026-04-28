import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Response as ExpressResponse } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerRequestBuilder,
  resendEmailVerificationCodeRequestBuilder,
  userBuilder,
  verifyEmailRequestBuilder,
} from '@repo/testing';
import { AuthController } from './auth.controller';
import { LoginCommand } from './commands/impl/login.command';
import { LogoutCommand } from './commands/impl/logout.command';
import { RefreshTokensCommand } from './commands/impl/refresh-tokens.command';
import { RegisterCommand } from './commands/impl/register.command';
import { VerifyEmailCommand } from './commands/impl/verify-email.command';
import { ResendEmailVerificationCodeCommand } from './commands/impl/resend-email-verification-code.command';

describe('AuthController', () => {
  let controller: AuthController;
  let commandBus: DeepMocked<CommandBus>;
  let configService: DeepMocked<ConfigService>;

  beforeEach(async () => {
    commandBus = createMock<CommandBus>();
    configService = createMock<ConfigService>();
    configService.get.mockReturnValue('development');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should execute RegisterCommand', async () => {
      const dto = registerRequestBuilder();
      const expectedResult = { id: 'user-id' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(commandBus.execute).toHaveBeenCalledWith(new RegisterCommand(dto));
      expect(result).toBe(expectedResult);
    });
  });

  describe('login', () => {
    it('should execute LoginCommand with user from request', async () => {
      const mockUser = userBuilder();
      const req = { user: { user: mockUser, isEmailVerified: true } } as any;
      const expectedResult = { accessToken: 'token' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.login(req);

      expect(commandBus.execute).toHaveBeenCalledWith(new LoginCommand(mockUser, true));
      expect(result).toBe(expectedResult);
    });
  });

  describe('logout', () => {
    it('should execute LogoutCommand if sessionId exists and clear cookie', async () => {
      const req = { user: { sessionId: 'session-id' } } as any;
      const res = { clearCookie: vi.fn() } as unknown as ExpressResponse;

      await controller.logout(req, res);

      expect(commandBus.execute).toHaveBeenCalledWith(new LogoutCommand('session-id'));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/',
        sameSite: 'lax',
        secure: false,
      });
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/auth/refresh',
        sameSite: 'lax',
        secure: false,
      });
    });

    it('should not execute LogoutCommand if sessionId is missing but still clear cookie', async () => {
      const req = { user: {} } as any;
      const res = { clearCookie: vi.fn() } as unknown as ExpressResponse;

      await controller.logout(req, res);

      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/',
        sameSite: 'lax',
        secure: false,
      });
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/auth/refresh',
        sameSite: 'lax',
        secure: false,
      });
    });
  });

  describe('refresh', () => {
    it('should execute RefreshTokensCommand when refresh token cookie is present', async () => {
      const req = { cookies: { refreshToken: 'refresh-token' } } as any;
      const expectedResult = { accessToken: 'new-token' };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.refresh(req);

      expect(commandBus.execute).toHaveBeenCalledWith(new RefreshTokensCommand('refresh-token'));
      expect(result).toBe(expectedResult);
    });

    it('should throw UnauthorizedException when refresh token cookie is missing', async () => {
      const req = { cookies: {} } as any;

      await expect(controller.refresh(req)).rejects.toThrow(UnauthorizedException);
      await expect(controller.refresh(req)).rejects.toThrow('Refresh token missing');
    });

    it('should throw UnauthorizedException when cookies property is missing', async () => {
      const req = {} as any;

      await expect(controller.refresh(req)).rejects.toThrow(UnauthorizedException);
    });
  });
 
  describe('verify-email', () => {
    it('should execute VerifyEmailCommand', async () => {
      const dto = verifyEmailRequestBuilder();
      const expectedResult = { success: true };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail(dto);

      expect(commandBus.execute).toHaveBeenCalledWith(new VerifyEmailCommand(dto));
      expect(result).toBe(expectedResult);
    });
  });

  describe('resend-email-verification-code', () => {
    it('should execute ResendEmailVerificationCodeCommand', async () => {
      const dto = resendEmailVerificationCodeRequestBuilder();
      const expectedResult = { success: true };
      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.resendEmailVerification(dto);

      expect(commandBus.execute).toHaveBeenCalledWith(new ResendEmailVerificationCodeCommand(dto));
      expect(result).toBe(expectedResult);
    });
  });
});
