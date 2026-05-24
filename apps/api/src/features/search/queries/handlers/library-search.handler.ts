import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LibrarySearchQueryImpl } from '../impl/library-search.query';
import { SearchService } from '../../services/search.service';
import { LibrarySearchResultsResponse } from '@repo/contracts';

type librarySearchData = LibrarySearchResultsResponse['data'];

@QueryHandler(LibrarySearchQueryImpl)
export class LibrarySearchHandler implements IQueryHandler<LibrarySearchQueryImpl> {
  constructor(private readonly searchService: SearchService) {}

  async execute(query: LibrarySearchQueryImpl): Promise<librarySearchData> {
    return this.searchService.librarySearch(query.userId, query.searchQuery);
  }
}
