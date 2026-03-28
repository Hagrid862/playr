import { PLAYBACK_REDIS } from '@/features/playback/utils/playback-redis.constants';
import { Inject, InternalServerErrorException, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type PlaybackState, PlaybackStateSchema } from '@repo/contracts';
import Redis from 'ioredis';
import { GetPlaybackStateQuery } from '../impl/get-playback-state.query';

@QueryHandler(GetPlaybackStateQuery)
export class GetPlaybackStateHandler implements IQueryHandler<GetPlaybackStateQuery> {
  private readonly logger = new Logger(GetPlaybackStateHandler.name);

  constructor(@Inject(PLAYBACK_REDIS) private readonly redis: Redis) {}

  async execute(query: GetPlaybackStateQuery): Promise<PlaybackState | null> {
    const key = `state:${query.userId}`;
    const raw = await this.redis.get(key);

    if (raw === null) return null;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      this.logger.error(`Failed to parse playback state for user ${query.userId}: ${error}`);
      throw new InternalServerErrorException(
        'Failed to parse playback state for user ' + query.userId,
      );
    }

    const parsed = PlaybackStateSchema.safeParse(parsedJson);

    if (!parsed.success) {
      this.logger.error(
        `[GetPlaybackStateHandler] Zod validation failed:`,
        JSON.stringify(parsed.error.issues, null, 2),
      );
      throw new InternalServerErrorException(
        'Failed to parse playback state for user ' + query.userId,
      );
    }

    return parsed.data;
  }
}
