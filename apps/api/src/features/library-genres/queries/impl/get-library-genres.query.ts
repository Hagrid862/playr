import type { GenreKind } from '@repo/db';

export class GetLibraryGenresQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly query?: string,
    public readonly kind?: GenreKind,
  ) {}
}
