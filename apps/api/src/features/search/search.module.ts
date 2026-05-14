import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SearchController } from './search.controller';
import { SearchService } from './services/search.service';
import { LiveSearchHandler } from './queries/handlers/live-search.handler';

const QueryHandlers = [LiveSearchHandler];

@Module({
  imports: [CqrsModule],
  controllers: [SearchController],
  providers: [SearchService, ...QueryHandlers],
})
export class SearchModule {}
