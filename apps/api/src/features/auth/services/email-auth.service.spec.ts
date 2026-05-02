import { Test, TestingModule } from '@nestjs/testing';
import { EmailAuthService } from './email-auth.service';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { MailService } from '@/shared/services/mail.service';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailAddressBuilder } from '@repo/testing/builders';
import { Logger } from '@nestjs/common';

describe('EmailAuthService', () => {
  let service: EmailAuthService;
  let otpCodeService: DeepMocked<OtpCodeService>;
  let mailService: DeepMocked<MailService>;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
  let logger: DeepMocked<Logger>;

  const mockEmailAddress = emailAddressBuilder({
    id: 'email-id-123',
    email: 'test@example.com',
    userId: 'user-id-123',
  });
  const mockOtpCode = '12345678';

  beforeEach(async () => {
    otpCodeService = createMock<OtpCodeService>();
    mailService = createMock<MailService>();
    emailAddressRepository = createMock<EmailAddressRepository>();
    logger = createMock<Logger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAuthService,
        { provide: OtpCodeService, useValue: otpCodeService },
        { provide: MailService, useValue: mailService },
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
      ],
    })
      .setLogger(logger) // Set the mocked logger
      .compile();

    service = module.get<EmailAuthService>(EmailAuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('beginEmailVerification', () => {
    it('should successfully begin email verification and return true', async () => {
      // Arrange
      otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
      mailService.sendEmailVerificationCode.mockResolvedValue(true);
      emailAddressRepository.edit.mockResolvedValue(mockEmailAddress); // Mock successful edit

      // Act
      const result = await service.beginEmailVerification(mockEmailAddress);

      // Assert
      expect(result).toBe(true);
      expect(otpCodeService.generateOTPCode).toHaveBeenCalledWith(
        mockEmailAddress,
        'emailVerification',
      );
      expect(mailService.sendEmailVerificationCode).toHaveBeenCalledWith(
        mockEmailAddress,
        mockOtpCode,
        expect.any(Number), // OTP_CODE_TTL is a constant, so any number is fine
      );
      expect(emailAddressRepository.edit).toHaveBeenCalledWith(mockEmailAddress.id, {
        status: 'pending',
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return false if email sending fails', async () => {
      // Arrange
      otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
      mailService.sendEmailVerificationCode.mockResolvedValue(false); // Simulate email sending failure
      emailAddressRepository.edit.mockResolvedValue(mockEmailAddress);

      // Act
      const result = await service.beginEmailVerification(mockEmailAddress);

      // Assert
      expect(result).toBe(false);
      expect(otpCodeService.generateOTPCode).toHaveBeenCalledWith(
        mockEmailAddress,
        'emailVerification',
      );
      expect(mailService.sendEmailVerificationCode).toHaveBeenCalledWith(
        mockEmailAddress,
        mockOtpCode,
        expect.any(Number),
      );
      expect(emailAddressRepository.edit).not.toHaveBeenCalled(); // Should not update status if email fails
      expect(logger.error).not.toHaveBeenCalled(); // No error logged for mailService returning false
    });

    it('should return false and log error if OTP generation fails', async () => {
      // Arrange
      const error = new Error('OTP generation failed');
      otpCodeService.generateOTPCode.mockRejectedValue(error); // Simulate OTP generation failure

      // Act
      const result = await service.beginEmailVerification(mockEmailAddress);

      // Assert
      expect(result).toBe(false);
      expect(otpCodeService.generateOTPCode).toHaveBeenCalledWith(
        mockEmailAddress,
        'emailVerification',
      );
      expect(mailService.sendEmailVerificationCode).not.toHaveBeenCalled();
      expect(emailAddressRepository.edit).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to begin email verification flow',
        expect.stringContaining('OTP generation failed'),
        'EmailAuthService',
      );
    });

    it('should return false and log error if OTP generation fails with an error that has no stack', async () => {
      // Arrange
      const error = new Error('OTP generation failed without stack');
      delete error.stack; // Explicitly remove the stack to trigger the branch
      otpCodeService.generateOTPCode.mockRejectedValue(error);

      // Act
      const result = await service.beginEmailVerification(mockEmailAddress);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to begin email verification flow',
        'OTP generation failed without stack',
        'EmailAuthService',
      );
    });

    it('should return false and log error if email status update fails after successful email send', async () => {
      // Arrange
      const error = new Error('Database update failed');
      otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
      mailService.sendEmailVerificationCode.mockResolvedValue(true);
      emailAddressRepository.edit.mockRejectedValue(error); // Simulate email status update failure

      // Act
      const result = await service.beginEmailVerification(mockEmailAddress);

      // Assert
      expect(result).toBe(false);
      expect(otpCodeService.generateOTPCode).toHaveBeenCalledWith(
        mockEmailAddress,
        'emailVerification',
      );
      expect(mailService.sendEmailVerificationCode).toHaveBeenCalledWith(
        mockEmailAddress,
        mockOtpCode,
        expect.any(Number),
      );
      expect(emailAddressRepository.edit).toHaveBeenCalledWith(mockEmailAddress.id, {
        status: 'pending',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to begin email verification flow',
        expect.stringContaining('Database update failed'),
        'EmailAuthService',
      );
    });

    it('should return false and log error for unexpected errors', async () => {
      // Arrange
      const unexpectedError = 'Something went wrong';
      otpCodeService.generateOTPCode.mockRejectedValue(unexpectedError); // Simulate a non-Error object being thrown

      // Act
      const result = await service.beginEmailVerification(mockEmailAddress);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to begin email verification flow',
        String(unexpectedError),
        'EmailAuthService',
      );
    });
  });
});
