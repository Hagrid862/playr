import { LibraryRepository } from "@/shared/repositories/library.repository";
import { ConflictException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Library } from "@repo/db";
import { CreateLibraryCommand } from "../impl/create-library.command";

@CommandHandler(CreateLibraryCommand)
export class CreateLibraryHandler implements ICommandHandler<CreateLibraryCommand> {
  constructor(private readonly libraryRepository: LibraryRepository) { }

  async execute(command: CreateLibraryCommand): Promise<Library> {
    const { userId } = command;

    const existingLibrary = await this.libraryRepository.getByUserId(userId);

    if (existingLibrary) {
      throw new ConflictException('Library already exists');
    }

    return this.libraryRepository.create({
      user: { connect: { id: userId } },
    });
  }
}