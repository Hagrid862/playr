import { ICommand } from '@nestjs/cqrs';
import { SetCurrentTimeStateRequest } from '@repo/contracts';

export class SetCurrentTimeStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly playbackDeviceId: string,
    public readonly request: SetCurrentTimeStateRequest,
  ) {}
}
