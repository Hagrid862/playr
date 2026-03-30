import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { type GetQueueStateResponse } from '@repo/contracts';
import { GetPlaybackStateQuery } from '../impl/get-playback-state.query';
import { GetQueueStateQuery } from '../impl/get-queue-state.query';

@QueryHandler(GetQueueStateQuery)
export class GetQueueStateHandler implements IQueryHandler<GetQueueStateQuery> {
  constructor(private readonly queryBus: QueryBus) {}

  async execute(query: GetQueueStateQuery): Promise<GetQueueStateResponse | null> {
    const state = await this.queryBus.execute(new GetPlaybackStateQuery(query.userId));
    if (state === null) return null;
    return { items: state.queue, version: state.version };
  }
}
