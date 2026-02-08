import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { CreateLibraryHandler } from "./commands/handlers/create-library.handler";
import { GetLibraryHandler } from "./commands/handlers/get-library.handler";
import { LibraryController } from "./library.controller";

@Module({
  imports: [CqrsModule],
  controllers: [LibraryController],
  providers: [CreateLibraryHandler, GetLibraryHandler],
  exports: [],
})
export class LibraryModule { }