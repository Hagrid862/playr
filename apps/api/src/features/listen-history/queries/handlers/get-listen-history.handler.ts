import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetListenHistoryQuery } from '../impl/get-listen-history.query';
import { ListenHistoryService } from '../../services/listen-history.service';

@QueryHandler(GetListenHistoryQuery)
export class GetListenHistoryHandler implements IQueryHandler<GetListenHistoryQuery> {
  constructor(private readonly listenHistoryService: ListenHistoryService) {}

  async execute(query: GetListenHistoryQuery) {
    const { userId, page, limit } = query;
    return this.listenHistoryService.getListenHistory(userId, page, limit);
  }
}
