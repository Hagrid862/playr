import { IQuery } from '@nestjs/cqrs';

export class GetAlbumQuery implements IQuery {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
