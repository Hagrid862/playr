import { Injectable } from '@nestjs/common';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { MailService } from '@/shared/services/mail.service';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';

@Injectable()
export class EmailAuthService {

  constructor(
    private readonly otpCodeService: OtpCodeService,
    private readonly mailService: MailService,
    private readonly emailAddressRepository: EmailAddressRepository
  ) {}

  async beginEmailVerification(email: string, emailId: string): Promise<boolean> {
    const otpCode = await this.otpCodeService.generateOTPCode(email, 'emailVerification');
    const emailSent = await this.mailService.sendEmailVerificationCode(email, otpCode);

    if (emailSent){
      await this.emailAddressRepository.edit(emailId, { status: 'pending' });
    }

    return emailSent;
  }
}