import { IQuery } from '@nestjs/cqrs';

export class GetLibraryAlbumQuery implements IQuery {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
