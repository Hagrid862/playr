import { UpdateArtistRequest } from '@repo/contracts';

export class UpdateArtistCommand {
  constructor(
    public readonly artistId: string,
    public readonly request: UpdateArtistRequest,
    public readonly userId: string,
  ) {}
}
