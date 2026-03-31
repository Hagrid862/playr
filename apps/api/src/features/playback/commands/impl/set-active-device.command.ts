import { ICommand } from '@nestjs/cqrs';
import { SetActiveDeviceRequest } from '@repo/contracts';

export class SetActiveDeviceCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetActiveDeviceRequest,
  ) {}
}
