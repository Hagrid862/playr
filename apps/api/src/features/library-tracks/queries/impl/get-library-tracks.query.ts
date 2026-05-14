import { IQuery } from '@nestjs/cqrs';

export class GetLibraryTracksQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly albumId?: string,
    public readonly genreId?: string,
  ) {}
}
