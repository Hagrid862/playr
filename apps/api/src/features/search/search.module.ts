import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SearchController } from './search.controller';
import { SearchService } from './services/search.service';
import { SearchSuggestionsHandler } from './queries/handlers/search-suggestions.handler';
import { LibrarySearchSuggestionsHandler } from './queries/handlers/library-search-suggestions.handler';

const QueryHandlers = [SearchSuggestionsHandler, LibrarySearchSuggestionsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [SearchController],
  providers: [SearchService, ...QueryHandlers],
})
export class SearchModule {}
