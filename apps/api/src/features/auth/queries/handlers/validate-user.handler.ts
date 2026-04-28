import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EmailStatus } from '@repo/db';
import { ValidateUserQuery } from '../impl/validate-user.query';
import type { AuthenticatedUser } from '@/common/types/auth.types';

@QueryHandler(ValidateUserQuery)
export class ValidateUserHandler implements IQueryHandler<ValidateUserQuery> {
  constructor(
    private readonly emailAddressRepository: EmailAddressRepository,
    private readonly hashingService: HashingService,
  ) {}

  async execute(query: ValidateUserQuery): Promise<AuthenticatedUser | null> {
    const { email, password } = query;
    const row = await this.emailAddressRepository.getPrimaryByEmailWithUser(email);

    if (!row?.user) {
      return null;
    }

    const { user, status: emailStatus } = row;

    const isPasswordValid = await this.hashingService.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    const isEmailVerified = emailStatus === EmailStatus.verified;

    return { user, isEmailVerified };
  }
}
