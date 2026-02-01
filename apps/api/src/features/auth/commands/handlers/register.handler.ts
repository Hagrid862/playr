import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterCommand } from '../impl/register.command';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmailStatus, User } from '@repo/db';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';

const MINIMUM_AGE = 13;

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: RegisterCommand): Promise<User | null> {
    const { payload } = command;
    const { username, email, password, firstName, lastName, birthDate, gender } = payload;

    // Validate birthDate format
    const birthDateObj = new Date(birthDate);
    if (isNaN(birthDateObj.getTime())) {
      throw new BadRequestException('Invalid birth date format');
    }

    // Ensure birthDate is not in the future
    const today = new Date();
    if (birthDateObj > today) {
      throw new BadRequestException('Birth date cannot be in the future');
    }

    // Age verification - must be at least 13 years old
    const age = this.calculateAge(birthDateObj);
    if (age < MINIMUM_AGE) {
      throw new BadRequestException(`You must be at least ${MINIMUM_AGE} years old to register`);
    }

    // Validate and normalize username
    const normalizedUsername = username.toLowerCase().trim();
    const usernameRegex = /^[a-z0-9_.]+$/;
    if (!usernameRegex.test(normalizedUsername)) {
      throw new BadRequestException(
        'Username can only contain letters, numbers, underscores, and dots',
      );
    }

    const existingEmail = await this.userRepository.GetByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.userRepository.GetByUsername(normalizedUsername);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Validate password strength
    if (!this.isPasswordStrong(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
      );
    }

    const hashedPassword = await this.hashingService.hash(password);
    const normalizedEmail = email.toLowerCase().trim();
    const formattedBirthDate = this.formatDateToDDMMYYYY(birthDateObj);

    // Use transaction to ensure atomicity - if email creation fails, user is rolled back
    const user = await this.prisma.client.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username: normalizedUsername,
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
          email: normalizedEmail,
          status: EmailStatus.created,
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

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return password.length >= minLength && hasUppercase && hasLowercase && hasNumber;
  }
}
