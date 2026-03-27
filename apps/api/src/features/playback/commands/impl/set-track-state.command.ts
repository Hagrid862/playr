import { ICommand } from '@nestjs/cqrs';
import { SetTrackStateRequest } from '@repo/contracts';

export class SetTrackStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetTrackStateRequest,
  ) {}
}
