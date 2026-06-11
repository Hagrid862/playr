import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailAddressBuilder } from '@repo/testing/builders';
import { EmailAuthType } from '@/features/auth/services/email-auth.service';
import { RESEND_CLIENT } from '@/shared/constants/resend.constants';
import { MailService } from './mail.service';
import { MailTemplateService } from './mail-template.service';

describe('MailService', () => {
  let service: MailService;
  let mailerService: DeepMocked<MailerService>;
  let mailTemplateService: DeepMocked<MailTemplateService>;
  let configService: DeepMocked<ConfigService>;
  let resendSend: ReturnType<typeof vi.fn>;

  const mockEmailAddress = emailAddressBuilder({
    id: 'email-id-123',
    email: 'test@example.com',
  });
  const mockOtpCode = '12345678';
  const mockTtl = 10;

  async function createService(options?: { resendApiKey?: string; resendClient?: unknown }) {
    mailerService = createMock<MailerService>();
    mailTemplateService = createMock<MailTemplateService>();
    configService = createMock<ConfigService>();
    resendSend = vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null });

    configService.get.mockImplementation((key: string) => {
      if (key === 'RESEND_API_KEY') return options?.resendApiKey;
      if (key === 'MAIL_FROM') return 'noreply@playr.com';
      return undefined;
    });

    mailTemplateService.render.mockReturnValue('<p>rendered html</p>');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
        { provide: MailTemplateService, useValue: mailTemplateService },
        {
          provide: RESEND_CLIENT,
          useValue:
            options?.resendClient !== undefined
              ? options.resendClient
              : options?.resendApiKey
                ? { emails: { send: resendSend } }
                : null,
        },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  }

  beforeEach(async () => {
    await createService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtpVerificationCodeViaEmail (SMTP)', () => {
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
        expect(resendSend).not.toHaveBeenCalled();
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
        expect(resendSend).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return false when mailerService fails', async () => {
        mailerService.sendMail.mockRejectedValue(new Error('SMTP connection error'));

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

  describe('sendOtpVerificationCodeViaEmail (Resend API)', () => {
    beforeEach(async () => {
      await createService({ resendApiKey: 're_test_key' });
    });

    it('should send email verification via Resend and return true', async () => {
      const result = await service.sendOtpVerificationCodeViaEmail(
        mockEmailAddress,
        mockOtpCode,
        'emailVerification',
        mockTtl,
      );

      expect(result).toBe(true);
      expect(mailTemplateService.render).toHaveBeenCalledWith('email-verification', {
        code: mockOtpCode,
        ttlMinutes: mockTtl,
        htmlTitle: 'Playr - Verify your email',
      });
      expect(resendSend).toHaveBeenCalledWith({
        from: '"Playr" <noreply@playr.com>',
        to: [mockEmailAddress.email],
        subject: 'Playr email verification',
        html: '<p>rendered html</p>',
      });
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should send password reset via Resend and return true', async () => {
      const result = await service.sendOtpVerificationCodeViaEmail(
        mockEmailAddress,
        mockOtpCode,
        'passwordReset',
        mockTtl,
      );

      expect(result).toBe(true);
      expect(mailTemplateService.render).toHaveBeenCalledWith('password-reset', {
        code: mockOtpCode,
        ttlMinutes: mockTtl,
        htmlTitle: 'Playr - Reset your password',
      });
      expect(resendSend).toHaveBeenCalledWith({
        from: '"Playr" <noreply@playr.com>',
        to: [mockEmailAddress.email],
        subject: 'Playr password reset',
        html: '<p>rendered html</p>',
      });
    });

    it('should return false when Resend returns an error', async () => {
      resendSend.mockResolvedValue({ data: null, error: { message: 'Resend API error' } });

      const result = await service.sendOtpVerificationCodeViaEmail(
        mockEmailAddress,
        mockOtpCode,
        'emailVerification',
        mockTtl,
      );

      expect(result).toBe(false);
    });

    it('should return false when API key is set but Resend client is missing', async () => {
      await createService({ resendApiKey: 're_test_key', resendClient: null });

      const result = await service.sendOtpVerificationCodeViaEmail(
        mockEmailAddress,
        mockOtpCode,
        'emailVerification',
        mockTtl,
      );

      expect(result).toBe(false);
    });
  });
});
