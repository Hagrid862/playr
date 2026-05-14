import { ICommand } from '@nestjs/cqrs';
import { ClearQueueRequest } from '@repo/contracts';

export class ClearQueueCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: ClearQueueRequest,
  ) {}
}
