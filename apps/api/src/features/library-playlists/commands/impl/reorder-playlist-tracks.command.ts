import { ReorderPlaylistTracksRequest } from '@repo/contracts';

export class ReorderPlaylistTracksCommand {
  constructor(
    public readonly playlistId: string,
    public readonly body: ReorderPlaylistTracksRequest,
    public readonly userId: string,
  ) {}
}
