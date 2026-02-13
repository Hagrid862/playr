export class DeleteLibraryArtistCommand {
  constructor(
    public readonly artistId: string,
    public readonly userId: string,
  ) {}
}
