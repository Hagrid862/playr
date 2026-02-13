export class UploadLibraryAlbumCoverCommand {
  constructor(
    public readonly albumId: string,
    public readonly file: Buffer,
    public readonly mimeType: string,
    public readonly userId: string,
  ) {}
}
