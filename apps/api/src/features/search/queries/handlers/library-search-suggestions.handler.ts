import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LibrarySearchSuggestionsQuery } from '../impl/library-search-suggestions.query';
import { SearchService } from '../../services/search.service';
import { LibrarySearchSuggestionsResults } from '@repo/contracts';

@QueryHandler(LibrarySearchSuggestionsQuery)
export class LibrarySearchSuggestionsHandler implements IQueryHandler<LibrarySearchSuggestionsQuery> {
  constructor(private readonly searchService: SearchService) {}

  async execute(query: LibrarySearchSuggestionsQuery): Promise<LibrarySearchSuggestionsResults> {
    return this.searchService.librarySearchSuggestions(query.userId, query.query, query.categories);
  }
}
