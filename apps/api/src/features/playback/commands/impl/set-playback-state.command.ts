import { SetPlaybackStateRequest } from './../../../../../../../packages/contracts/src/playback/request/set-playback-state.reqeust';
import { ICommand } from '@nestjs/cqrs';

export class SetPlaybackStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly state: SetPlaybackStateRequest,
  ) {}
}
