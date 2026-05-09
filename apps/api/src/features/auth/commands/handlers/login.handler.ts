import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginResponse, UserWithPrimaryEmailSchema } from '@repo/contracts';
import { LoginCommand } from '../impl/login.command';
import { TokenService } from '../../services/token.service';
import { EmailAuthService } from '@/features/auth/services/email-auth.service';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';

type LoginData = LoginResponse['data'];

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly emailAuthService: EmailAuthService,
    private readonly emailAddressRepository: EmailAddressRepository,
  ) {}

  async execute(command: LoginCommand): Promise<LoginData & { refreshToken?: string }> {
    const { user, isEmailVerified } = command;

    const primaryEmailObject = await this.emailAddressRepository.getPrimaryByUserId(user.id);

    if (!primaryEmailObject) {
      throw new Error('User has no primary email address');
    }

    const sanitizedUser = UserWithPrimaryEmailSchema.parse({
      ...user,
      emailAddresses: [primaryEmailObject],
    });

    if (!isEmailVerified) {
      const isEmailSent = await this.emailAuthService.beginOtpVerificationViaEmail(
        primaryEmailObject,
        'emailVerification',
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
