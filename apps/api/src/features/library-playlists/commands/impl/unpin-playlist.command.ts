export class UnpinPlaylistCommand {
  constructor(
    public readonly pinId: string,
    public readonly userId: string,
  ) {}
}
