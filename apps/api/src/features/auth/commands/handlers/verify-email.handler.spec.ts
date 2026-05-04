import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus } from '@repo/db';
import { emailAddressBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { TokenService } from '@/features/auth/services/token.service';
import { VerifyEmailCommand } from '@/features/auth/commands/impl/verify-email.command';
import { VerifyEmailHandler } from './verify-email.handler';

describe('VerifyEmailHandler', () => {
  let handler: VerifyEmailHandler;
  let otpCodeService: DeepMocked<OtpCodeService>;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
  let tokenService: DeepMocked<TokenService>;
  let userRepository: DeepMocked<UserRepository>;

  beforeEach(async () => {
    otpCodeService = createMock<OtpCodeService>();
    emailAddressRepository = createMock<EmailAddressRepository>();
    tokenService = createMock<TokenService>();
    userRepository = createMock<UserRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailHandler,
        { provide: OtpCodeService, useValue: otpCodeService },
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    handler = module.get<VerifyEmailHandler>(VerifyEmailHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockPayload = { email: 'test@example.com', otpCode: '123456' };
    const command = new VerifyEmailCommand(mockPayload);

    it('should successfully verify email and return auth tokens', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        id: 'email-123',
        email: mockPayload.email,
        status: EmailStatus.created,
      });
      const mockUserObject = userBuilder({
        id: 'user-123',
        username: 'testuser',
      });
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      otpCodeService.verifyOTPCode.mockResolvedValue(true);
      userRepository.getByEmail.mockResolvedValue(mockUserObject as any);
      tokenService.generateAuthTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(otpCodeService.verifyOTPCode).toHaveBeenCalledWith(
        mockEmailObject,
        mockPayload.otpCode,
        'emailVerification',
      );
      expect(emailAddressRepository.edit).toHaveBeenCalledWith(mockEmailObject.id, {
        status: 'verified',
      });
      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(
        mockUserObject.id,
        mockUserObject.username,
      );
      expect(result).toEqual({
        ...mockTokens,
        user: expect.objectContaining({
          id: mockUserObject.id,
          username: mockUserObject.username,
        }),
      });
    });

    it('should throw BadRequestException if email is not found', async () => {
      // Arrange
      emailAddressRepository.getByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Email address not found');
    });

    it('should throw UnauthorizedException if OTP code is invalid', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder();
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      otpCodeService.verifyOTPCode.mockResolvedValue(false);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid or expired OTP code');
    });

    it('should throw BadRequestException if user is not found after verification', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder();
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      otpCodeService.verifyOTPCode.mockResolvedValue(true);
      userRepository.getByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    });
  });
});
