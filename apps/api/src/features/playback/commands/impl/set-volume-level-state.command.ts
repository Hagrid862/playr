import { ICommand } from '@nestjs/cqrs';
import { SetVolumeLevelStateRequest } from '@repo/contracts';

export class SetVolumeLevelStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetVolumeLevelStateRequest,
  ) {}
}
