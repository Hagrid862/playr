import { IQuery } from '@nestjs/cqrs';

export class GetQueueStateQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
