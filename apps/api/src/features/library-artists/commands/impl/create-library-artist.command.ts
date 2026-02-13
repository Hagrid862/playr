import { CreateLibraryArtistRequest } from '@repo/contracts';

export class CreateLibraryArtistCommand {
  constructor(
    public readonly request: CreateLibraryArtistRequest,
    public readonly userId: string,
  ) {}
}
