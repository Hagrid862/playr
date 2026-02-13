import { UpdateLibraryArtistRequest } from '@repo/contracts';

export class UpdateArtistCommand {
  constructor(
    public readonly artistId: string,
    public readonly request: UpdateLibraryArtistRequest,
    public readonly userId: string,
  ) {}
}
