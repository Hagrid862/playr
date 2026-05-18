export class GetLibraryPlaylistDetailQuery {
  constructor(
    public readonly userId: string,
    public readonly playlistId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
