import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ListenHistoryController } from './listen-history.controller';
import { ListenHistoryService } from './services/listen-history.service';
import { GetListenHistoryHandler } from './queries/handlers/get-listen-history.handler';
import { ClearListenHistoryHandler } from './commands/handlers/clear-listen-history.handler';

@Module({
  imports: [CqrsModule],
  controllers: [ListenHistoryController],
  providers: [
    ListenHistoryService,
    GetListenHistoryHandler,
    ClearListenHistoryHandler,
  ],
  exports: [ListenHistoryService],
})
export class ListenHistoryModule {}
