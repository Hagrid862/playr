import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchSuggestionsQuery } from '../impl/search-suggestions.query';
import { SearchService } from '../../services/search.service';
import { SearchSuggestionsResults } from '@repo/contracts';

@QueryHandler(SearchSuggestionsQuery)
export class SearchSuggestionsHandler implements IQueryHandler<SearchSuggestionsQuery> {
  constructor(private readonly searchService: SearchService) {}

  async execute(query: SearchSuggestionsQuery): Promise<SearchSuggestionsResults> {
    return this.searchService.searchSuggestions(query.query, query.userId);
  }
}
