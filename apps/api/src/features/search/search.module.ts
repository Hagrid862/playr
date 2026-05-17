import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SearchController } from './search.controller';
import { SearchService } from './services/search.service';
import { SearchSuggestionsService } from './services/search-suggestions.service';
import { SearchSuggestionsHandler } from './queries/handlers/search-suggestions.handler';
import { LibrarySearchSuggestionsHandler } from './queries/handlers/library-search-suggestions.handler';
import { SearchHandler } from './queries/handlers/search.handler';
import { LibrarySearchHandler } from './queries/handlers/library-search.handler';

const QueryHandlers = [
  SearchSuggestionsHandler,
  LibrarySearchSuggestionsHandler,
  SearchHandler,
  LibrarySearchHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [SearchController],
  providers: [SearchService, SearchSuggestionsService, ...QueryHandlers],
})
export class SearchModule {}
