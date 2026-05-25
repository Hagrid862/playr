import { AddPlaylistAlbumRequest } from '@repo/contracts';

export class AddPlaylistAlbumCommand {
  constructor(
    public readonly playlistId: string,
    public readonly body: AddPlaylistAlbumRequest,
    public readonly userId: string,
  ) {}
}
