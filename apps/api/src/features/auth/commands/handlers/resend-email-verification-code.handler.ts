import { ResendEmailVerificationCodeResponse } from '@repo/contracts';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ResendEmailVerificationCodeCommand
} from '@/features/auth/commands/impl/resend-email-verification-code.command';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { EmailAuthService } from '@/features/auth/services/email-auth.service';

type ResendEmailVerificationCodeData = ResendEmailVerificationCodeResponse['data'];

@CommandHandler(ResendEmailVerificationCodeCommand)
export class ResendEmailVerificationCodeHandler implements ICommandHandler<ResendEmailVerificationCodeCommand> {

  constructor(
    private readonly emailAddressRepository: EmailAddressRepository,
    private readonly emailAuthService: EmailAuthService,
  ) {}

  async execute(command: ResendEmailVerificationCodeCommand): Promise<ResendEmailVerificationCodeData> {
    const { email } = command.payload;

    const emailObject = await this.emailAddressRepository.getByEmail(email);

    if (!emailObject) {
      throw new BadRequestException('Email not found or already verified');
    }

    //NOTE both of these bad request exceptions are the same because we don't want to give away whether an email
    // is registered or not, or if it's already verified or not. This is a security measure.

    if(emailObject.status === 'verified'){
      throw new BadRequestException('Email not found or already verified');
    }
    
    const isEmailSent = await this.emailAuthService.beginEmailVerification(emailObject.email, emailObject.id);

    if(!isEmailSent){
      throw new InternalServerErrorException('Failed to send verification email');
    } else {
      return {
        isEmailSent,
      };
    }
  }
}