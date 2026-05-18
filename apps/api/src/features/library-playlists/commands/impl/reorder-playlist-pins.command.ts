import { ReorderPlaylistPinsRequest } from '@repo/contracts';

export class ReorderPlaylistPinsCommand {
  constructor(
    public readonly body: ReorderPlaylistPinsRequest,
    public readonly userId: string,
  ) {}
}
