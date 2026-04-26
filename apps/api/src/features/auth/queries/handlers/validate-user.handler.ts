import { HashingService } from '@/shared/services/hashing.service';
import { AuthenticatedPrincipal } from '@/common/types/auth.types';
import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EmailStatus } from '@repo/db';
import { ValidateUserQuery } from '../impl/validate-user.query';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';

@QueryHandler(ValidateUserQuery)
export class ValidateUserHandler implements IQueryHandler<ValidateUserQuery> {
  constructor(
    private readonly emailAddressRepository: EmailAddressRepository,
    private readonly hashingService: HashingService,
  ) {}

  async execute(query: ValidateUserQuery): Promise<AuthenticatedPrincipal | null> {
    const { email, password } = query;
    const normalizedEmail = email.toLowerCase().trim();
    const emailAddress = await this.emailAddressRepository.findOneWithInclude(
      {
        email: normalizedEmail,
        type: 'primary',
        deletedAt: null,
      },
      {
        user: true,
      },
    );

    if (!emailAddress?.user) {
      return null;
    }

    const user = emailAddress.user;

    const isPasswordValid = await this.hashingService.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    if (emailAddress.status !== EmailStatus.verified) {
      throw new UnauthorizedException('Email not verified');
    }

    const { password: hashedPassword, ...principal } = user;
    void hashedPassword;
    return principal;
  }
}
