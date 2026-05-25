import { AddPlaylistTrackRequest } from '@repo/contracts';

export class AddPlaylistTrackCommand {
  constructor(
    public readonly playlistId: string,
    public readonly body: AddPlaylistTrackRequest,
    public readonly userId: string,
  ) {}
}
