import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PlaybackState,
  PlaybackStatePayload,
  PlaybackStatePayloadSchema,
  PlaybackStateSchema,
} from '@repo/contracts';
import { Redis } from 'ioredis';
import { PLAYBACK_REDIS } from '../utils/playback-redis.constants';

const ATOMIC_SET_MAX_ATTEMPTS = 8;

const PLAYBACK_STATE_DEFAULT: Pick<
  PlaybackStatePayload,
  | 'deviceName'
  | 'deviceIcon'
  | 'isPlaying'
  | 'currentTime'
  | 'volume'
  | 'repeatMode'
  | 'shuffle'
  | 'favorited'
  | 'inLibrary'
> = {
  deviceName: 'unknown',
  deviceIcon: 'other',
  isPlaying: false,
  currentTime: 0,
  volume: 0.8,
  repeatMode: 'off',
  shuffle: false,
  favorited: 'not-set',
  inLibrary: false,
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Injectable()
export class PlaybackStatePersistenceService {
  private readonly logger = new Logger(PlaybackStatePersistenceService.name);

  constructor(@Inject(PLAYBACK_REDIS) private readonly redis: Redis) {}

  /**
   * First write only: key must be absent. Merges defaults + partial payload, version 1.
   */
  async createIfAbsent(
    userId: string,
    sessionId: string,
    partial: Partial<PlaybackStatePayload> & Pick<PlaybackStatePayload, 'trackData'>,
  ): Promise<PlaybackState> {
    const mergedPayload = PlaybackStatePayloadSchema.parse({
      ...PLAYBACK_STATE_DEFAULT,
      ...partial,
      sessionId,
      userId,
    });

    const firstState: PlaybackState = {
      ...mergedPayload,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const key = `state:${userId}`;
    for (let attempt = 0; attempt < ATOMIC_SET_MAX_ATTEMPTS; attempt++) {
      try {
        await this.redis.watch(key);
      } catch (error) {
        this.logger.error(`Redis WATCH failed: ${String(error)}`);
        throw new InternalServerErrorException('Failed to create playback state.');
      }

      const raw = await this.redis.get(key);
      if (raw) {
        await this.redis.unwatch();
        throw new ConflictException('Playback state already exists for this user.');
      }

      let execResult: [error: Error | null, result: unknown][] | null;
      try {
        execResult = await this.redis.multi().set(key, JSON.stringify(firstState)).exec();
      } catch (error) {
        await this.redis.unwatch();
        this.logger.error(`Redis MULTI/EXEC failed: ${String(error)}`);
        throw new InternalServerErrorException('Failed to create playback state.');
      }

      if (execResult === null) {
        const base = Math.min(10 * 2 ** attempt, 1000);
        const jitter = Math.floor(Math.random() * Math.min(base, 50));
        await sleep(base + jitter);
        continue;
      }

      return firstState;
    }

    throw new ServiceUnavailableException(
      'Playback state could not be created due to concurrent updates; please retry.',
    );
  }

  /**
   * Key must exist. Merges into current doc, bumps version + updatedAt.
   */
  async applyMutation(
    userId: string,
    expectedVersion: number,
    merge: (current: PlaybackState) => Omit<PlaybackState, 'version' | 'updatedAt'> | PlaybackState,
  ): Promise<PlaybackState> {
    const key = `state:${userId}`;
    for (let attempt = 0; attempt < ATOMIC_SET_MAX_ATTEMPTS; attempt++) {
      try {
        await this.redis.watch(key);
      } catch (error) {
        await this.redis.unwatch();
        this.logger.error(`Redis WATCH failed: ${String(error)}`);
        throw new InternalServerErrorException('Failed to update playback state.');
      }

      const raw = await this.redis.get(key);
      if (!raw) {
        await this.redis.unwatch();
        this.logger.error(`Playback state not found for user ${userId}`);
        throw new NotFoundException('Playback state not found for user ' + userId);
      }

      let parsed: PlaybackState;
      try {
        parsed = PlaybackStateSchema.parse(JSON.parse(raw));
      } catch {
        await this.redis.unwatch();
        this.logger.error('Failed to parse playback state.');
        throw new InternalServerErrorException('Failed to parse playback state.');
      }

      if (parsed.version !== expectedVersion) {
        await this.redis.unwatch();
        this.logger.error('Expected version mismatch.');
        throw new ConflictException('Expected version mismatch.');
      }

      let merged: Omit<PlaybackState, 'version' | 'updatedAt'> | PlaybackState;
      try {
        merged = merge(parsed);
      } catch (error) {
        await this.redis.unwatch();
        throw error;
      }

      const next: PlaybackState = {
        ...parsed,
        ...merged,
        version: parsed.version + 1,
        updatedAt: new Date().toISOString(),
      };

      let execResult: [error: Error | null, result: unknown][] | null;
      try {
        execResult = await this.redis.multi().set(key, JSON.stringify(next)).exec();
      } catch (error) {
        await this.redis.unwatch();
        this.logger.error(`Redis MULTI/EXEC failed: ${String(error)}`);
        throw new InternalServerErrorException('Failed to update playback state.');
      }

      if (execResult === null) {
        const base = Math.min(10 * 2 ** attempt, 1000);
        const jitter = Math.floor(Math.random() * Math.min(base, 50));
        await sleep(base + jitter);
        continue;
      }

      return next;
    }

    throw new ServiceUnavailableException(
      'Playback state could not be saved due to concurrent updates; please retry.',
    );
  }
}
