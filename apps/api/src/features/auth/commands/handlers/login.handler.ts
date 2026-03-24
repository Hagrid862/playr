import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginResponse, UserSchema } from '@repo/contracts';
import { LoginCommand } from '../impl/login.command';
import { TokenService } from '../../services/token.service';
import { EmailAuthService } from '@/features/auth/services/email-auth.service';
import { EmailType } from '@repo/db';


type LoginData = LoginResponse['data'];


@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly emailAuthService: EmailAuthService
  ) {}

  async execute(command: LoginCommand): Promise<LoginData & { refreshToken?: string }> {
    const { user, isEmailVerified } = command;

    const sanitizedUser = UserSchema.parse(user);

    if (!isEmailVerified) {
      const primaryEmailObject = sanitizedUser.emailAddresses?.find(e => e.type === EmailType.primary);

      if (!primaryEmailObject) {
        throw new Error('User has no primary email address');
      }

      const isEmailSent = await this.emailAuthService.beginEmailVerification(
        primaryEmailObject.email,
        primaryEmailObject.id,
      );

      return {
        outcome: 'unauthenticated',
        user: sanitizedUser,
        isEmailSent,
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
