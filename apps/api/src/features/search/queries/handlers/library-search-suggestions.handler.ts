import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LibrarySearchSuggestionsQuery } from '../impl/library-search-suggestions.query';
import { SearchSuggestionsService } from '../../services/search-suggestions.service';
import { LibrarySearchSuggestionsResults } from '@repo/contracts';

type librarySearchSuggestionsData = LibrarySearchSuggestionsResults['data'];

@QueryHandler(LibrarySearchSuggestionsQuery)
export class LibrarySearchSuggestionsHandler implements IQueryHandler<LibrarySearchSuggestionsQuery> {
  constructor(private readonly searchSuggestionsService: SearchSuggestionsService) {}

  async execute(query: LibrarySearchSuggestionsQuery): Promise<librarySearchSuggestionsData> {
    return this.searchSuggestionsService.librarySearchSuggestions(
      query.userId,
      query.query,
      query.categories,
    );
  }
}
