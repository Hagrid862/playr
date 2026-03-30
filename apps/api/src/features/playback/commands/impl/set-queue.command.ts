import { ICommand } from '@nestjs/cqrs';
import { SetQueueRequest } from '@repo/contracts';

export class SetQueueCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetQueueRequest,
  ) {}
}
