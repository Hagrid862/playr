import { ICommand } from '@nestjs/cqrs';
import { BulkCreateLibraryTracksRequest } from '@repo/contracts';

export class BulkCreateLibraryTracksCommand implements ICommand {
  constructor(
    public readonly albumId: string,
    public readonly body: BulkCreateLibraryTracksRequest,
    public readonly userId: string,
  ) {}
}
