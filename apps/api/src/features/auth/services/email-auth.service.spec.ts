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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAuthService,
        { provide: OtpCodeService, useValue: otpCodeService },
        { provide: MailService, useValue: mailService },
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
      ],
    }).compile();

    service = module.get<EmailAuthService>(EmailAuthService);

    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('beginOtpVerificationViaEmail', () => {
    describe('emailVerification type', () => {
      it('should successfully begin email verification and return true', async () => {
        // Arrange
        otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
        mailService.sendOtpVerificationCodeViaEmail.mockResolvedValue(true);
        emailAddressRepository.edit.mockResolvedValue(mockEmailAddress);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'emailVerification',
        );

        // Assert
        expect(result).toBe(true);
        expect(otpCodeService.generateOTPCode).toHaveBeenCalledWith(
          mockEmailAddress,
          'emailVerification',
        );
        expect(mailService.sendOtpVerificationCodeViaEmail).toHaveBeenCalledWith(
          mockEmailAddress,
          mockOtpCode,
          'emailVerification',
          expect.any(Number),
        );
        expect(emailAddressRepository.edit).toHaveBeenCalledWith(mockEmailAddress.id, {
          status: 'pending',
        });
      });

      it('should return false if email sending fails', async () => {
        // Arrange
        otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
        mailService.sendOtpVerificationCodeViaEmail.mockResolvedValue(false);
        emailAddressRepository.edit.mockResolvedValue(mockEmailAddress);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'emailVerification',
        );

        // Assert
        expect(result).toBe(false);
        expect(emailAddressRepository.edit).not.toHaveBeenCalled();
      });
    });

    describe('passwordReset type', () => {
      it('should successfully begin password reset and return true', async () => {
        // Arrange
        otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
        mailService.sendOtpVerificationCodeViaEmail.mockResolvedValue(true);
        emailAddressRepository.edit.mockResolvedValue(mockEmailAddress);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'passwordReset',
        );

        // Assert
        expect(result).toBe(true);
        expect(otpCodeService.generateOTPCode).toHaveBeenCalledWith(
          mockEmailAddress,
          'passwordReset',
        );
        expect(mailService.sendOtpVerificationCodeViaEmail).toHaveBeenCalledWith(
          mockEmailAddress,
          mockOtpCode,
          'passwordReset',
          expect.any(Number),
        );
        expect(emailAddressRepository.edit).toHaveBeenCalledWith(mockEmailAddress.id, {
          status: 'pending',
        });
      });

      it('should return false if email sending fails', async () => {
        // Arrange
        otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
        mailService.sendOtpVerificationCodeViaEmail.mockResolvedValue(false);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'passwordReset',
        );

        // Assert
        expect(result).toBe(false);
        expect(emailAddressRepository.edit).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return false and log error if OTP generation fails', async () => {
        // Arrange
        const error = new Error('OTP generation failed');
        otpCodeService.generateOTPCode.mockRejectedValue(error);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'emailVerification',
        );

        // Assert
        expect(result).toBe(false);
        expect(mailService.sendOtpVerificationCodeViaEmail).not.toHaveBeenCalled();
        expect(emailAddressRepository.edit).not.toHaveBeenCalled();
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          'Failed to begin email verification flow',
          expect.stringContaining('OTP generation failed'),
        );
      });

      it('should return false and log error if OTP generation fails with an error that has no stack', async () => {
        // Arrange
        const error = new Error('OTP generation failed without stack');
        delete error.stack;
        otpCodeService.generateOTPCode.mockRejectedValue(error);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'emailVerification',
        );

        // Assert
        expect(result).toBe(false);
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          'Failed to begin email verification flow',
          'OTP generation failed without stack',
        );
      });

      it('should return false and log error if email status update fails after successful email send', async () => {
        // Arrange
        const error = new Error('Database update failed');
        otpCodeService.generateOTPCode.mockResolvedValue(mockOtpCode);
        mailService.sendOtpVerificationCodeViaEmail.mockResolvedValue(true);
        emailAddressRepository.edit.mockRejectedValue(error);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'passwordReset',
        );

        // Assert
        expect(result).toBe(false);
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          'Failed to begin email verification flow',
          expect.stringContaining('Database update failed'),
        );
      });

      it('should return false and log error for unexpected errors', async () => {
        // Arrange
        const unexpectedError = 'Something went wrong';
        otpCodeService.generateOTPCode.mockRejectedValue(unexpectedError);

        // Act
        const result = await service.beginOtpVerificationViaEmail(
          mockEmailAddress,
          'emailVerification',
        );

        // Assert
        expect(result).toBe(false);
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          'Failed to begin email verification flow',
          String(unexpectedError),
        );
      });
    });
  });
});
