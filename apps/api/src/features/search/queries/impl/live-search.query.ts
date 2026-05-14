import { IQuery } from '@nestjs/cqrs';

export class LiveSearchQuery implements IQuery {
  constructor(
    public readonly query: string,
    public readonly userId?: string,
  ) {}
}
