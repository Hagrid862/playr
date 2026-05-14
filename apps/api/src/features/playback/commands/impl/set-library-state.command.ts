import { ICommand } from '@nestjs/cqrs';
import { SetLibraryStateRequest } from '@repo/contracts';

export class SetLibraryStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetLibraryStateRequest,
  ) {}
}
