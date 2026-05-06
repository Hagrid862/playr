import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailAddressBuilder } from '@repo/testing/builders';
import { EmailAuthType } from '@/features/auth/services/email-auth.service';

describe('MailService', () => {
  let service: MailService;
  let mailerService: DeepMocked<MailerService>;

  const mockEmailAddress = emailAddressBuilder({
    id: 'email-id-123',
    email: 'test@example.com',
  });
  const mockOtpCode = '12345678';
  const mockTtl = 10;

  beforeEach(async () => {
    mailerService = createMock<MailerService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: MailerService, useValue: mailerService }],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtpVerificationCodeViaEmail', () => {
    describe('emailVerification type', () => {
      it('should successfully send an email verification email and return true', async () => {
        mailerService.sendMail.mockResolvedValue({});

        const result = await service.sendOtpVerificationCodeViaEmail(
          mockEmailAddress,
          mockOtpCode,
          'emailVerification',
          mockTtl,
        );

        expect(result).toBe(true);
        expect(mailerService.sendMail).toHaveBeenCalledWith({
          to: mockEmailAddress.email,
          subject: 'Playr email verification',
          template: 'email-verification',
          context: {
            code: mockOtpCode,
            ttlMinutes: mockTtl,
            htmlTitle: 'Playr - Verify your email',
          },
        });
      });
    });

    describe('passwordReset type', () => {
      it('should successfully send a password reset email and return true', async () => {
        mailerService.sendMail.mockResolvedValue({});

        const result = await service.sendOtpVerificationCodeViaEmail(
          mockEmailAddress,
          mockOtpCode,
          'passwordReset',
          mockTtl,
        );

        expect(result).toBe(true);
        expect(mailerService.sendMail).toHaveBeenCalledWith({
          to: mockEmailAddress.email,
          subject: 'Playr password reset',
          template: 'password-reset',
          context: {
            code: mockOtpCode,
            ttlMinutes: mockTtl,
            htmlTitle: 'Playr - Reset your password',
          },
        });
      });
    });

    describe('error handling', () => {
      it('should return false when mailerService fails', async () => {
        const error = new Error('SMTP connection error');
        mailerService.sendMail.mockRejectedValue(error);

        const result = await service.sendOtpVerificationCodeViaEmail(
          mockEmailAddress,
          mockOtpCode,
          'emailVerification',
          mockTtl,
        );

        expect(result).toBe(false);
      });

      it('should return false when non-Error object is thrown', async () => {
        mailerService.sendMail.mockRejectedValue('String error');

        const result = await service.sendOtpVerificationCodeViaEmail(
          mockEmailAddress,
          mockOtpCode,
          'passwordReset',
          mockTtl,
        );

        expect(result).toBe(false);
      });

      it('should return false for unsupported email auth type', async () => {
        const result = await service.sendOtpVerificationCodeViaEmail(
          mockEmailAddress,
          mockOtpCode,
          'unsupportedType' as EmailAuthType,
          mockTtl,
        );

        expect(result).toBe(false);
      });
    });
  });
});
