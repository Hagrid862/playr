export class UploadLibraryArtistBannerCommand {
  constructor(
    public readonly artistId: string,
    public readonly file: Buffer,
    public readonly mimeType: string,
    public readonly userId: string,
  ) {}
}
