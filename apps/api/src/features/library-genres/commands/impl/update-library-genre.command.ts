import type { UpdateLibraryGenreRequest } from '@repo/contracts';

export class UpdateLibraryGenreCommand {
  constructor(
    public readonly genreId: string,
    public readonly request: UpdateLibraryGenreRequest,
    public readonly userId: string,
  ) {}
}
