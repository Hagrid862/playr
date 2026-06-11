import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import type { EmailAddress } from '@repo/db';
import { Resend } from 'resend';
import { Env } from '@/common/config/env.schema';
import { EmailAuthType } from '@/features/auth/services/email-auth.service';
import { RESEND_CLIENT } from '@/shared/constants/resend.constants';
import { MailTemplateService } from './mail-template.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService<Env>,
    private readonly mailTemplateService: MailTemplateService,
    @Optional() @Inject(RESEND_CLIENT) private readonly resend: Resend | null,
    @Optional() private readonly mailerService?: MailerService,
  ) {}

  async sendOtpVerificationCodeViaEmail(
    email: EmailAddress,
    otpCode: string,
    type: EmailAuthType,
    ttl: number,
  ): Promise<boolean> {
    try {
      switch (type) {
        case 'emailVerification':
          await this.emailVerification(email, otpCode, ttl);
          break;
        case 'passwordReset':
          await this.passwordReset(email, otpCode, ttl);
          break;
        default:
          throw new BadRequestException(`Unsupported email auth type: ${type}`);
      }

      this.logger.log(
        `Email verification code successfully sent to email id ${email.id} type ${type}`,
      );

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to sent OTP code for email verification to email id ${email.id}, type ${type}: ${errorMessage}`,
      );

      return false;
    }
  }

  private async emailVerification(email: EmailAddress, otpCode: string, ttl: number) {
    await this.sendEmail({
      to: email.email,
      subject: 'Playr email verification',
      template: 'email-verification',
      context: {
        code: otpCode,
        ttlMinutes: ttl,
        htmlTitle: 'Playr - Verify your email',
      },
    });
  }

  private async passwordReset(email: EmailAddress, otpCode: string, ttl: number) {
    await this.sendEmail({
      to: email.email,
      subject: 'Playr password reset',
      template: 'password-reset',
      context: {
        code: otpCode,
        ttlMinutes: ttl,
        htmlTitle: 'Playr - Reset your password',
      },
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    const resendApiKey = this.configService.get('RESEND_API_KEY', { infer: true });

    if (resendApiKey) {
      if (!this.resend) {
        throw new Error('Resend client is not configured');
      }

      const html = this.mailTemplateService.render(options.template, options.context);
      const { error } = await this.resend.emails.send({
        from: `"Playr" <${this.configService.get('MAIL_FROM', { infer: true })}>`,
        to: [options.to],
        subject: options.subject,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    if (!this.mailerService) {
      throw new Error('SMTP mail is not configured');
    }

    await this.mailerService.sendMail({
      to: options.to,
      subject: options.subject,
      template: options.template,
      context: options.context,
    });
  }
}
