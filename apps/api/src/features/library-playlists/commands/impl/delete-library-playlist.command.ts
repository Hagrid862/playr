export class DeleteLibraryPlaylistCommand {
  constructor(
    public readonly playlistId: string,
    public readonly userId: string,
  ) {}
}
