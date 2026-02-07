import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ValidateUserQuery } from '../impl/validate-user.query';
import { UserRepository } from '@/shared/repositories/user.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { EmailStatus, User } from '@repo/db';
import { UnauthorizedException } from '@nestjs/common';

@QueryHandler(ValidateUserQuery)
export class ValidateUserHandler implements IQueryHandler<ValidateUserQuery> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
  ) {}

  async execute(query: ValidateUserQuery): Promise<User | null> {
    const { email, password } = query;
    const userWithStatus = await this.userRepository.getByEmailWithStatus(email);

    if (!userWithStatus) {
      return null;
    }

    const isPasswordValid = await this.hashingService.compare(password, userWithStatus.password);

    if (!isPasswordValid) {
      return null;
    }

    if (userWithStatus.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    if (userWithStatus.emailStatus !== EmailStatus.verified) {
      throw new UnauthorizedException('Email not verified');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { emailStatus, ...user } = userWithStatus;
    return user as User;
  }
}
