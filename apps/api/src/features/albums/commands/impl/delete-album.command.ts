export class DeleteAlbumCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
