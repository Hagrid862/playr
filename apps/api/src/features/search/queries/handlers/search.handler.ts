import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchQueryImpl } from '../impl/search.query';
import { SearchService } from '../../services/search.service';
import { SearchResultsResponse } from '@repo/contracts';

@QueryHandler(SearchQueryImpl)
export class SearchHandler implements IQueryHandler<SearchQueryImpl> {
  constructor(private readonly searchService: SearchService) {}

  async execute(query: SearchQueryImpl): Promise<SearchResultsResponse> {
    return this.searchService.search(query.userId, query.searchQuery);
  }
}
