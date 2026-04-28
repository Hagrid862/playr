import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailAddressBuilder } from '@repo/testing/builders';
import { Logger } from '@nestjs/common';

describe('MailService', () => {
  let service: MailService;
  let mailerService: DeepMocked<MailerService>;
  let logger: DeepMocked<Logger>;

  const mockEmailAddress = emailAddressBuilder({
    id: 'email-id-123',
    email: 'test@example.com',
  });
  const mockOtpCode = '12345678';
  const mockTtl = 10;

  beforeEach(async () => {
    mailerService = createMock<MailerService>();
    logger = createMock<Logger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: mailerService },
      ],
    })
      .setLogger(logger)
      .compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmailVerificationCode', () => {
    it('should successfully send an email and return true', async () => {
      mailerService.sendMail.mockResolvedValue({});

      const result = await service.sendEmailVerificationCode(
        mockEmailAddress,
        mockOtpCode,
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
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`successfully sent to email id ${mockEmailAddress.id}`),
      );
    });

    it('should return false and log error when mailerService fails', async () => {
      const error = new Error('SMTP connection error');
      mailerService.sendMail.mockRejectedValue(error);

      const result = await service.sendEmailVerificationCode(
        mockEmailAddress,
        mockOtpCode,
        mockTtl,
      );

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to sent OTP code for email verification to email id ${mockEmailAddress.id}: SMTP connection error`),
      );
    });

    it('should return false and log unknown error when non-Error object is thrown', async () => {
      mailerService.sendMail.mockRejectedValue('String error');

      const result = await service.sendEmailVerificationCode(
        mockEmailAddress,
        mockOtpCode,
        mockTtl,
      );

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error'),
      );
    });
  });
});
