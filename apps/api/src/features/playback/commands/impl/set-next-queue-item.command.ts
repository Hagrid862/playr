import { ICommand } from '@nestjs/cqrs';
import { SetNextQueueItemRequest } from '@repo/contracts';

export class SetNextQueueItemCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetNextQueueItemRequest,
  ) {}
}
