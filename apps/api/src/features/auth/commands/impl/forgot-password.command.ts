import {ForgotPasswordRequestDto} from "@/features/auth/dto/forgot-password.request.dto";

export class ForgotPasswordCommand {
  constructor(
    public readonly payload: ForgotPasswordRequestDto,
  ) {}
}