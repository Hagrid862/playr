export class DeleteLibraryPlaylistCoverCommand {
  constructor(
    public readonly playlistId: string,
    public readonly userId: string,
  ) {}
}
