import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserPrivateProfile } from '@repo/db';
import { CreatePrivateProfileCommand } from '../impl/create-private-profile.command';

@CommandHandler(CreatePrivateProfileCommand)
export class CreatePrivateProfileHandler implements ICommandHandler<CreatePrivateProfileCommand> {
  constructor(private readonly privateProfileRepository: PrivateProfileRepository) { }

  async execute(command: CreatePrivateProfileCommand): Promise<UserPrivateProfile> {
    const { userId } = command;

    const existingProfile = await this.privateProfileRepository.getByUserId(userId);

    if (existingProfile) {
      throw new ConflictException('Private profile for this user already exists');
    }

    return this.privateProfileRepository.create({
      user: { connect: { id: userId } },
    });
  }
}
