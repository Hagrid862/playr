import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LibrarySearchSuggestionsQuery } from '../impl/library-search-suggestions.query';
import { SearchSuggestionsService } from '../../services/search-suggestions.service';
import { LibrarySearchSuggestionsResults } from '@repo/contracts';

@QueryHandler(LibrarySearchSuggestionsQuery)
export class LibrarySearchSuggestionsHandler implements IQueryHandler<LibrarySearchSuggestionsQuery> {
  constructor(private readonly searchSuggestionsService: SearchSuggestionsService) {}

  async execute(query: LibrarySearchSuggestionsQuery): Promise<LibrarySearchSuggestionsResults> {
    return this.searchSuggestionsService.librarySearchSuggestions(
      query.userId,
      query.query,
      query.categories,
    );
  }
}
