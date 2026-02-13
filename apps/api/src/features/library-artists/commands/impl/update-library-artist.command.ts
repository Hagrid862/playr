import { UpdateLibraryArtistRequest } from '@repo/contracts';

export class UpdateLibraryArtistCommand {
  constructor(
    public readonly artistId: string,
    public readonly request: UpdateLibraryArtistRequest,
    public readonly userId: string,
  ) {}
}
