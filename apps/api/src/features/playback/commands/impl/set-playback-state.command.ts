import { ICommand } from '@nestjs/cqrs';
import { SetPlaybackStateRequest } from './../../../../../../../packages/contracts/src/playback/request/set-playback-state.reqeust';

export class SetPlaybackStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly request: SetPlaybackStateRequest,
  ) {}
}
