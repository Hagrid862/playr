import { ICommand } from '@nestjs/cqrs';
import { SetRepeatStateRequest } from '@repo/contracts';

export class SetRepeatStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetRepeatStateRequest,
  ) {}
}
