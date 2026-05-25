export class RemovePlaylistTrackCommand {
  constructor(
    public readonly playlistId: string,
    public readonly trackId: string,
    public readonly userId: string,
  ) {}
}
