export class GetLibraryGenreQuery {
  constructor(
    public readonly userId: string,
    public readonly genreId: string,
  ) {}
}
