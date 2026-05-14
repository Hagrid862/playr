import { ICommand } from '@nestjs/cqrs';
import { SetShuffleStateRequest } from '@repo/contracts';

export class SetShuffleStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetShuffleStateRequest,
  ) {}
}
