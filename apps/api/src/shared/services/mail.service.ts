import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import type { EmailAddress } from '@repo/db';
import { EmailAuthType } from '@/features/auth/services/email-auth.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

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
    await this.mailerService.sendMail({
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
    await this.mailerService.sendMail({
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
}
