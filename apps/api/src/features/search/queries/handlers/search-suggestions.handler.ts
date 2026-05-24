import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchSuggestionsQuery } from '../impl/search-suggestions.query';
import { SearchSuggestionsService } from '../../services/search-suggestions.service';
import { SearchSuggestionsResults } from '@repo/contracts';

type searchSuggestionsData = SearchSuggestionsResults['data'];

@QueryHandler(SearchSuggestionsQuery)
export class SearchSuggestionsHandler implements IQueryHandler<SearchSuggestionsQuery> {
  constructor(private readonly searchSuggestionsService: SearchSuggestionsService) {}

  async execute(query: SearchSuggestionsQuery): Promise<searchSuggestionsData> {
    return this.searchSuggestionsService.searchSuggestions(query.query, query.userId);
  }
}
