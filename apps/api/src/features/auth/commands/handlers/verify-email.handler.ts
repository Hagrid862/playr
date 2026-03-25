import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VerifyEmailCommand } from '@/features/auth/commands/impl/verify-email.command';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { VerifyEmailResponse } from '@repo/contracts';
import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';

type VerifyEmailData = VerifyEmailResponse['data'];

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand>{
  private readonly logger = new Logger(VerifyEmailHandler.name);

  constructor(
    private readonly otpCodeService: OtpCodeService,
    private readonly emailAddressRepository: EmailAddressRepository,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailData> {
    const { email, otpCode } = command.payload;

    const emailObject = await this.emailAddressRepository.getByEmail(email);

    if (!emailObject) {
      throw new BadRequestException('Email address not found');
    }

    const isCodeValid = await this.otpCodeService.verifyOTPCode(email, otpCode, 'emailVerification');

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    await this.emailAddressRepository.edit(emailObject.id, { status: 'verified' });

    this.logger.log(`Successfully verified email address ${email}`);

    return {
      success: true,
    };
  }
}