export class UploadTrackAudioCommand {
  constructor(
    public readonly trackId: string,
    public readonly userId: string,
    public readonly file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {}
}
