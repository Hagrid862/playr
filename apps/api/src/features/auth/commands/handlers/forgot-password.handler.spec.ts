import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { emailAddressBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { EmailAuthService } from '@/features/auth/services/email-auth.service';
import { ForgotPasswordCommand } from '../impl/forgot-password.command';
import { ForgotPasswordHandler } from './forgot-password.handler';

describe('ForgotPasswordHandler', () => {
  let handler: ForgotPasswordHandler;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
  let emailAuthService: DeepMocked<EmailAuthService>;

  beforeEach(async () => {
    emailAddressRepository = createMock<EmailAddressRepository>();
    emailAuthService = createMock<EmailAuthService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotPasswordHandler,
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
        { provide: EmailAuthService, useValue: emailAuthService },
      ],
    }).compile();

    handler = module.get<ForgotPasswordHandler>(ForgotPasswordHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockPayload = { email: 'test@example.com' };
    const command = new ForgotPasswordCommand(mockPayload);

    it('should successfully send password reset email and return isEmailSent', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
      });
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(true);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(emailAuthService.beginOtpVerificationViaEmail).toHaveBeenCalledWith(
        mockEmailObject,
        'passwordReset',
      );
      expect(result).toEqual({ isEmailSent: true });
    });

    it('should return isEmailSent false if email is not found', async () => {
      // Arrange
      emailAddressRepository.getByEmail.mockResolvedValue(null);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual({ isEmailSent: false });
    });

    it('should throw BadRequestException if sending email fails', async () => {
      // Arrange
      const mockEmailObject = emailAddressBuilder({
        email: 'test@example.com',
      });
      emailAddressRepository.getByEmail.mockResolvedValue(mockEmailObject as any);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(false);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Failed to send email for password retrieval',
      );
    });
  });
});

