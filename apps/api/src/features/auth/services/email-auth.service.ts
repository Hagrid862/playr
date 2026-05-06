import { Injectable, Logger } from '@nestjs/common';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { MailService } from '@/shared/services/mail.service';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import type { EmailAddress } from '@repo/db';
import { OTP_CODE_TTL } from '@/features/auth/constants/auth.constants';

export type EmailAuthType = 'emailVerification' | 'passwordReset';

@Injectable()
export class EmailAuthService {
  private readonly logger = new Logger(EmailAuthService.name);

  constructor(
    private readonly otpCodeService: OtpCodeService,
    private readonly mailService: MailService,
    private readonly emailAddressRepository: EmailAddressRepository,
  ) {}

  async beginOtpVerificationViaEmail(email: EmailAddress, type: EmailAuthType): Promise<boolean> {
    try {
      const otpCode = await this.otpCodeService.generateOTPCode(email, type);
      const emailSent = await this.mailService.sendOtpVerificationCodeViaEmail(
        email,
        otpCode,
        type,
        OTP_CODE_TTL,
      );

      if (emailSent) {
        await this.emailAddressRepository.edit(email.id, { status: 'pending' });
      }

      return emailSent;
    } catch (error) {
      const details = error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error('Failed to begin email verification flow', details);
      return false;
    }
  }
}
