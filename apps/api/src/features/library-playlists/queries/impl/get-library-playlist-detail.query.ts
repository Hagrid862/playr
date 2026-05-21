import type { PlaylistTrackSort } from '@repo/contracts';

export class GetLibraryPlaylistDetailQuery {
  constructor(
    public readonly userId: string,
    public readonly playlistId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly sort: PlaylistTrackSort,
  ) {}
}
