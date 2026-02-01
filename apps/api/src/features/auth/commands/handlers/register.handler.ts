import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterCommand } from '../impl/register.command';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmailStatus, User } from '@repo/db';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: RegisterCommand): Promise<User | null> {
    const { payload } = command;
    // Note: username and email are already normalized (lowercase, trimmed) by Zod transforms
    const { username, email, password, firstName, lastName, birthDate, gender } = payload;

    // Check for existing email
    const existingEmail = await this.userRepository.GetByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check for existing username
    const existingUsername = await this.userRepository.GetByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await this.hashingService.hash(password);
    const formattedBirthDate = this.formatDateToDDMMYYYY(new Date(birthDate));

    // Use transaction to ensure atomicity - if email creation fails, user is rolled back
    const user = await this.prisma.client.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          firstName,
          lastName,
          birthDate: formattedBirthDate,
          gender,
        },
      });

      if (!createdUser) {
        throw new InternalServerErrorException('Failed to create user');
      }

      const createdEmail = await tx.emailAddress.create({
        data: {
          email,
          status: EmailStatus.verified, // TODO: change to created after creating email verification system
          userId: createdUser.id,
        },
      });

      if (!createdEmail) {
        throw new InternalServerErrorException('Failed to create email address');
      }

      return createdUser;
    });

    return user;
  }

  private formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
