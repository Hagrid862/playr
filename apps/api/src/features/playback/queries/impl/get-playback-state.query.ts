import { IQuery } from '@nestjs/cqrs';

export class GetPlaybackStateQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
