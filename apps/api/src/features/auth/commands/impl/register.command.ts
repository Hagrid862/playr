import { RegisterRequestDto } from '../../dto/register.request.dto';

export class RegisterCommand {
  constructor(public readonly payload: RegisterRequestDto) {}
}
