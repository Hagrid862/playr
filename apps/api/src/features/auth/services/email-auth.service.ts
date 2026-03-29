import { Injectable, Logger } from '@nestjs/common';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { MailService } from '@/shared/services/mail.service';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';

@Injectable()
export class EmailAuthService {
  private readonly logger = new Logger(EmailAuthService.name);

  constructor(
    private readonly otpCodeService: OtpCodeService,
    private readonly mailService: MailService,
    private readonly emailAddressRepository: EmailAddressRepository
  ) {}

  async beginEmailVerification(email: string, emailId: string): Promise<boolean> {
    try {
      const otpCode = await this.otpCodeService.generateOTPCode(email, 'emailVerification');
      const emailSent = await this.mailService.sendEmailVerificationCode(email, otpCode);

      if (emailSent) {
        await this.emailAddressRepository.edit(emailId, { status: 'pending' });
      }

      return emailSent;
    } catch (error) {
      const details = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error('Failed to begin email verification flow', details);
      return false;
    }
  }
}