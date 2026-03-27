import { ICommand } from '@nestjs/cqrs';
import { SetPlayingStateRequest } from '@repo/contracts';

export class SetPlayingStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetPlayingStateRequest,
  ) {}
}
