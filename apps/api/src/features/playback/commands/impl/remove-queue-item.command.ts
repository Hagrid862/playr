import { ICommand } from '@nestjs/cqrs';
import { RemoveQueueItemRequest } from '@repo/contracts';

export class RemoveQueueItemCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: RemoveQueueItemRequest,
  ) {}
}
