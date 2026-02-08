import { LibraryRepository } from "@/shared/repositories/library.repository";
import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Library } from "@repo/db";
import { GetLibraryCommand } from "../impl/get-library.command";

@CommandHandler(GetLibraryCommand)
export class GetLibraryHandler implements ICommandHandler<GetLibraryCommand> {
  constructor(private readonly libraryRepository: LibraryRepository) { }

  async execute(command: GetLibraryCommand): Promise<Library> {
    const { userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    return library;
  }
}