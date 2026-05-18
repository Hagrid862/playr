import { PinPlaylistRequest } from '@repo/contracts';

export class PinPlaylistCommand {
  constructor(
    public readonly body: PinPlaylistRequest,
    public readonly userId: string,
  ) {}
}
