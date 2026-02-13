export class GetLibraryArtistsQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
