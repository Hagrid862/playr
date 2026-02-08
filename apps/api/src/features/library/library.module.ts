import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { CreateLibraryHandler } from "./commands/handlers/create-library.handler";
import { LibraryController } from "./library.controller";

@Module({
  imports: [CqrsModule],
  controllers: [LibraryController],
  providers: [CreateLibraryHandler],
  exports: [],
})
export class LibraryModule { }