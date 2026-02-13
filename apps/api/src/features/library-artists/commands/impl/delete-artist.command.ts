export class DeleteArtistCommand {
  constructor(
    public readonly artistId: string,
    public readonly userId: string,
  ) {}
}
