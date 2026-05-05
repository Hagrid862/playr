import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import type { EmailAddress } from '@repo/db';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendEmailVerificationCode(
    email: EmailAddress,
    otpCode: string,
    ttl: number,
  ): Promise<boolean> {
    try {
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

      this.logger.log(`Email verification code successfully sent to email id ${email.id}`);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to sent OTP code for email verification to email id ${email.id}: ${errorMessage}`,
      );

      return false;
    }
  }
}
