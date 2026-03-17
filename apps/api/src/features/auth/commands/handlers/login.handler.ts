import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginResponse, UserSchema } from '@repo/contracts';
import { LoginCommand } from '../impl/login.command';
import { TokenService } from '../../services/token.service';


type LoginData = LoginResponse['data'];


@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(private readonly tokenService: TokenService) {}

  async execute(command: LoginCommand): Promise<LoginData & { refreshToken?: string }> {
    const { user, isEmailVerified } = command;

    const sanitizedUser = UserSchema.parse(user);

    if (!isEmailVerified) {
      return {
        outcome: 'unauthenticated',
        user: sanitizedUser,
      };
    }

    const tokens = await this.tokenService.generateAuthTokens(user.id, user.username);

    return {
      outcome: 'authenticated',
      ...tokens,
      user: sanitizedUser,
    };
  }
}
