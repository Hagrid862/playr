import { IQuery } from '@nestjs/cqrs';
import { LibrarySearchQuery } from '@repo/contracts';

export class LibrarySearchQueryImpl implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly searchQuery: LibrarySearchQuery,
  ) {}
}
