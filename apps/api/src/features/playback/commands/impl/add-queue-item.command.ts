import { ICommand } from '@nestjs/cqrs';
import { AddQueueItemRequest } from '@repo/contracts';

export class AddQueueItemCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: AddQueueItemRequest,
  ) {}
}
