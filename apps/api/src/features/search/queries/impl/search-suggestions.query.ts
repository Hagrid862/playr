import { IQuery } from '@nestjs/cqrs';

export class SearchSuggestionsQuery implements IQuery {
  constructor(
    public readonly query: string,
    public readonly userId?: string,
  ) {}
}
