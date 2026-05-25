export class UploadLibraryPlaylistCoverCommand {
  constructor(
    public readonly playlistId: string,
    public readonly file: Buffer,
    public readonly mimeType: string,
    public readonly userId: string,
  ) {}
}
