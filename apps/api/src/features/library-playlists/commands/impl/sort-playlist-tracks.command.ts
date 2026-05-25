import { SortPlaylistTracksRequest } from '@repo/contracts';

export class SortPlaylistTracksCommand {
  constructor(
    public readonly playlistId: string,
    public readonly body: SortPlaylistTracksRequest,
    public readonly userId: string,
  ) {}
}
