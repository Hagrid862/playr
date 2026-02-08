import { CreateLibraryRequestDto } from "../../dto/create-library.request.dto";

export class CreateLibraryCommand {
  constructor(public readonly userId: string, public readonly body: CreateLibraryRequestDto) { }
}
