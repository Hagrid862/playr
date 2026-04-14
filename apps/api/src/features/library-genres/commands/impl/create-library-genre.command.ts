import type { CreateLibraryGenreRequest } from '@repo/contracts';

export class CreateLibraryGenreCommand {
  constructor(
    public readonly request: CreateLibraryGenreRequest,
    public readonly userId: string,
  ) {}
}
