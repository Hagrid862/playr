import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
  ) {}

  async sendEmailVerificationCode(email: string, otpCode: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Playr email verification',
        template: 'email-verification', //TODO finish the handlebars schemas
        context: {
          code: otpCode,
          HtmlTitle: 'Verify your email',
        },
      });

      this.logger.log(`Email verification code successfully sent to ${email}`);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to sent OTP code for email verification email to ${email}: ${errorMessage}`);

      return false;
    }
  }
}