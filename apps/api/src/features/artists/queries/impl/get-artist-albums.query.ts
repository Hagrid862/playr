import { IQuery } from '@nestjs/cqrs';

export class GetArtistAlbumsQuery implements IQuery {
  constructor(
    public readonly artistId: string,
    public readonly userId: string,
  ) {}
}
