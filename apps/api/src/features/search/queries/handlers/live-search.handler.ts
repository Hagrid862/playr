import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LiveSearchQuery } from '../impl/live-search.query';
import { SearchService } from '../../services/search.service';
import { LiveSearchResults } from '@repo/contracts';

@QueryHandler(LiveSearchQuery)
export class LiveSearchHandler
  implements IQueryHandler<LiveSearchQuery, LiveSearchResults>
{
  constructor(private readonly searchService: SearchService) {}

  async execute(query: LiveSearchQuery): Promise<LiveSearchResults> {
    return this.searchService.liveSearch(query.query, query.userId);
  }
}
