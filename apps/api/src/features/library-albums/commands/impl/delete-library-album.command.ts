export class DeleteLibraryAlbumCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
