export class DeleteLibraryAlbumCoverCommand {
  constructor(
    public readonly albumId: string,
    public readonly userId: string,
  ) {}
}
