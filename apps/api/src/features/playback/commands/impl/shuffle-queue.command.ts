import { ICommand } from '@nestjs/cqrs';
import { ShuffleQueueRequest } from '@repo/contracts';

export class ShuffleQueueCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: ShuffleQueueRequest,
  ) {}
}
