import { IQuery } from '@nestjs/cqrs';
import { SearchQuery } from '@repo/contracts';

export class SearchQueryImpl implements IQuery {
  constructor(
    public readonly userId: string | null,
    public readonly searchQuery: SearchQuery,
  ) {}
}
