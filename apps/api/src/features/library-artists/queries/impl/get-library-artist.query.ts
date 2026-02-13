export class GetLibraryArtistQuery {
  constructor(
    public readonly userId: string,
    public readonly artistId: string,
  ) {}
}
