import { ICommand } from '@nestjs/cqrs';
import { SetPlayingStateRequest } from '@repo/contracts';

export class SetPlayingStateCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly playbackDeviceId: string,
    public readonly playbackDeviceName: string,
    public readonly playbackDeviceIcon:
      | 'desktop'
      | 'mobile'
      | 'tablet'
      | 'speaker'
      | 'tv'
      | 'game-console'
      | 'other',
    public readonly request: SetPlayingStateRequest,
  ) {}
}
