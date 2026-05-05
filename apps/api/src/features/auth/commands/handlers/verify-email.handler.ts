import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VerifyEmailCommand } from '@/features/auth/commands/impl/verify-email.command';
import { OtpCodeService } from '@/features/auth/services/otp-code.service';
import { UserSchema, VerifyEmailResponse } from '@repo/contracts';
import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { TokenService } from '@/features/auth/services/token.service';
import { UserRepository } from '@/shared/repositories/user.repository';

type VerifyEmailData = VerifyEmailResponse['data'];

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  private readonly logger = new Logger(VerifyEmailHandler.name);

  constructor(
    private readonly otpCodeService: OtpCodeService,
    private readonly emailAddressRepository: EmailAddressRepository,
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailData> {
    const { email, otpCode } = command.payload;

    const emailObject = await this.emailAddressRepository.getByEmail(email);

    if (!emailObject) {
      throw new BadRequestException('Email address not found');
    }

    const isCodeValid = await this.otpCodeService.verifyOTPCode(
      emailObject,
      otpCode,
      'emailVerification',
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    await this.emailAddressRepository.edit(emailObject.id, { status: 'verified' });

    this.logger.log(`Successfully verified email address email id ${emailObject.id}`);

    const userObject = await this.userRepository.getByEmail(email);

    if (!userObject) {
      throw new BadRequestException('User not found for the provided email address');
    }

    const sanitizedUser = UserSchema.parse(userObject);

    const tokens = await this.tokenService.generateAuthTokens(userObject.id, userObject.username);

    return {
      ...tokens,
      user: sanitizedUser,
    };
  }
}
