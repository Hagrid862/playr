import { IQuery } from '@nestjs/cqrs';
import type { LibraryTrackListSortBy, LibraryTrackListSortOrder } from '@repo/contracts';

export class GetLibraryTracksQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly albumId?: string,
    public readonly genreId?: string,
    public readonly sortBy?: LibraryTrackListSortBy,
    public readonly sortOrder?: LibraryTrackListSortOrder,
  ) {}
}
