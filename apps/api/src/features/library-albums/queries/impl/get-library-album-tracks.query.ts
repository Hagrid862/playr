import { IQuery } from '@nestjs/cqrs';

export class GetLibraryAlbumTracksQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly albumId: string,
  ) {}
}
