import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
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
      return true;
    } catch (error) {
      return false;
    }
  }
}