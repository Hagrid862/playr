import { ICommand } from '@nestjs/cqrs';
import { ReorderQueueItemsRequest } from '@repo/contracts';

export class ReorderQueueItemsCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: ReorderQueueItemsRequest,
  ) {}
}
