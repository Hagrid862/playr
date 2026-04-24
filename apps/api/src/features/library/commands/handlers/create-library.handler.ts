import { LibraryRepository } from '@/shared/repositories/library.repository';
import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Library } from '@repo/db';
import { CreateLibraryCommand } from '../impl/create-library.command';

@CommandHandler(CreateLibraryCommand)
export class CreateLibraryHandler implements ICommandHandler<CreateLibraryCommand> {
  constructor(private readonly libraryRepository: LibraryRepository) {}

  async execute(command: CreateLibraryCommand): Promise<Library> {
    const { userId } = command;

    const existingLibrary = await this.libraryRepository.findOne({ userId });

    if (existingLibrary) {
      throw new ConflictException('Library already exists');
    }

    try {
      return await this.libraryRepository.create({
        user: { connect: { id: userId } },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Library already exists');
      }
      throw error;
    }
  }
}
