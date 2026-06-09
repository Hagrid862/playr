import { IQuery } from '@nestjs/cqrs';
import { SearchSuggestionsCategories } from '@repo/contracts';

export class LibrarySearchSuggestionsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly query: string,
    public readonly categories?: SearchSuggestionsCategories[],
  ) {}
}
