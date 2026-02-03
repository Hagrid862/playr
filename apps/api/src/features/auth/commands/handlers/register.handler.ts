import { UserRepository } from '@/shared/repositories/user.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ZodUser } from '@repo/contracts';
import { EmailStatus } from '@repo/db';
import { RegisterCommand } from '../impl/register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: RegisterCommand): Promise<ZodUser> {
    const { payload } = command;
    // Note: username and email are already normalized (lowercase, trimmed) by Zod transforms
    const { username, email, password, firstName, lastName, birthDate, gender } = payload;

    // Check for existing email and username in parallel
    const [existingEmail, existingUsername] = await Promise.all([
      this.userRepository.GetByEmail(email),
      this.userRepository.GetByUsername(username),
    ]);

    // Check email first (prioritized if both exist)
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await this.hashingService.hash(password);
    // Use birthDate as-is (already in YYYY-MM-DD format from Zod validation)
    const isoFormattedBirthDate = birthDate;

    // Use transaction to ensure atomicity - if email creation fails, user is rolled back
    const user = await this.prisma.client.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          firstName,
          lastName,
          birthDate: isoFormattedBirthDate,
          gender,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          gender: true,
          description: true,
          avatarId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });

      await tx.emailAddress.create({
        data: {
          email,
          status: EmailStatus.verified, // TODO: change to created after creating email verification system
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    return user;
  }
}
