import { ICommand } from '@nestjs/cqrs';
import { SetPlaybackStateRequest } from '@repo/contracts';

export class SetPlaybackStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetPlaybackStateRequest,
  ) {}
}
