import { ICommand } from '@nestjs/cqrs';

export class DeleteLibraryTrackCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
