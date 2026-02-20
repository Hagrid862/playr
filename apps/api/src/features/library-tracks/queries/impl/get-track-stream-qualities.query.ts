import { IQuery } from '@nestjs/cqrs';

export class GetTrackStreamQualitiesQuery implements IQuery {
  constructor(public readonly id: string) {}
}
