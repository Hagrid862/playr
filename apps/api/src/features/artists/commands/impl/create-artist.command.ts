import { CreateArtistRequest } from '@repo/contracts';

export class CreateArtistCommand {
  constructor(
    public readonly request: CreateArtistRequest,
    public readonly userId: string,
  ) {}
}
