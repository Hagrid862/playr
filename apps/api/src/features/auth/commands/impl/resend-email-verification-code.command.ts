import { ResendEmailVerificationCodeRequestDto } from '@/features/auth/dto/resend-email-verification-code.request.dto';

export class ResendEmailVerificationCodeCommand {
  constructor(public readonly payload: ResendEmailVerificationCodeRequestDto) {}
}

