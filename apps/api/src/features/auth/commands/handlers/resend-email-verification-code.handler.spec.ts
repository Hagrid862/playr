import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus } from '@repo/db';
import { emailAddressBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { EmailAuthService } from '@/features/auth/services/email-auth.service';
import { ResendEmailVerificationCodeCommand } from '../impl/resend-email-verification-code.command';
import { ResendEmailVerificationCodeHandler } from './resend-email-verification-code.handler';

describe('ResendEmailVerificationCodeHandler', () => {
  let handler: ResendEmailVerificationCodeHandler;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
  let emailAuthService: DeepMocked<EmailAuthService>;

  beforeEach(async () => {
    emailAddressRepository = createMock<EmailAddressRepository>();
    emailAuthService = createMock<EmailAuthService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendEmailVerificationCodeHandler,
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
        { provide: EmailAuthService, useValue: emailAuthService },
      ],
    }).compile();

    handler = module.get<ResendEmailVerificationCodeHandler>(ResendEmailVerificationCodeHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockPayload = { email: 'test@example.com' };
    const command = new ResendEmailVerificationCodeCommand(mockPayload);

    it('should successfully resend verification email', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
        status: EmailStatus.created,
      });
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(true);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(emailAuthService.beginOtpVerificationViaEmail).toHaveBeenCalledWith(mockEmailObject);
      expect(result).toEqual({ isEmailSent: true });
    });

    it('should throw BadRequestException if email is not found', async () => {
      // Arrange
      emailAddressRepository.getByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Email not found or already verified');
    });

    it('should throw BadRequestException if email is already verified', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
        status: EmailStatus.verified,
      });
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Email not found or already verified');
    });

    it('should throw InternalServerErrorException if sending email fails', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
        status: EmailStatus.created,
      });
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(false);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
      await expect(handler.execute(command)).rejects.toThrow('Failed to send verification email');
    });
  });
});
