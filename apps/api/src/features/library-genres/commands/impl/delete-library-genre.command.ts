export class DeleteLibraryGenreCommand {
  constructor(
    public readonly genreId: string,
    public readonly userId: string,
  ) {}
}
