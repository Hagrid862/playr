import { VerifyEmailRequestDto } from '@/features/auth/dto/verify-email.request.dto';

export class VerifyEmailCommand {
  constructor(public readonly payload: VerifyEmailRequestDto) {}
}
