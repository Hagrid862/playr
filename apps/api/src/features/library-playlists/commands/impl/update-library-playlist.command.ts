import { UpdateLibraryPlaylistRequest } from '@repo/contracts';

export class UpdateLibraryPlaylistCommand {
  constructor(
    public readonly playlistId: string,
    public readonly body: UpdateLibraryPlaylistRequest,
    public readonly userId: string,
  ) {}
}
