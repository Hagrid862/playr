import { StreamAudioQuality } from '@repo/contracts';

export class GetTrackStreamQuery {
  constructor(
    public readonly trackId: string,
    public readonly requestedQuality: StreamAudioQuality,
    public readonly range?: string,
  ) {}
}
