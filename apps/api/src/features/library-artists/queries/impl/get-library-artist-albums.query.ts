export class GetLibraryArtistAlbumsQuery {
  constructor(
    public readonly userId: string,
    public readonly artistId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
