import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserSchema, ZodUser } from '@repo/contracts';
import { LoginCommand } from '../impl/login.command';
import { TokenService } from '../../services/token.service';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(private readonly tokenService: TokenService) {}

  async execute(
    command: LoginCommand,
  ): Promise<{ accessToken: string; refreshToken: string; user: ZodUser }> {
    const { user } = command;

    const tokens = await this.tokenService.generateAuthTokens(user.id, user.username);

    const sanitizedUser = UserSchema.parse(user);

    return {
      ...tokens,
      user: sanitizedUser,
    };
  }
}
