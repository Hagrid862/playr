import { CreateLibraryArtistRequest } from '@repo/contracts';

export class CreateArtistCommand {
  constructor(
    public readonly request: CreateLibraryArtistRequest,
    public readonly userId: string,
  ) {}
}
