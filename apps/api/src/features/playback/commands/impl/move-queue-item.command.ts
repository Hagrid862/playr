import { ICommand } from '@nestjs/cqrs';
import { MoveQueueItemRequest } from '@repo/contracts';

export class MoveQueueItemCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: MoveQueueItemRequest,
  ) {}
}
