import { ICommand } from '@nestjs/cqrs';
import { SetFavoriteStateRequest } from '@repo/contracts';

export class SetFavoriteStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetFavoriteStateRequest,
  ) {}
}
