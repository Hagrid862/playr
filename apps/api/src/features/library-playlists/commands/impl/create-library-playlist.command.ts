import { CreateLibraryPlaylistRequest } from '@repo/contracts';

export class CreateLibraryPlaylistCommand {
  constructor(
    public readonly body: CreateLibraryPlaylistRequest,
    public readonly userId: string,
  ) {}
}
