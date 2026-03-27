import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PlaybackState,
  PlaybackStatePayload,
  PlaybackStatePayloadSchema,
  PlaybackStateSchema,
} from '@repo/contracts';
import Redis from 'ioredis';
import { PLAYBACK_REDIS } from '../../utils/playback-redis.constrants';
import { SetPlaybackStateCommand } from './../impl/set-playback-state.command';

const ATOMIC_SET_MAX_ATTEMPTS = 8;

@CommandHandler(SetPlaybackStateCommand)
export class SetPlaybackStateHandler implements ICommandHandler<SetPlaybackStateCommand> {
  private readonly logger = new Logger(SetPlaybackStateHandler.name);

  constructor(@Inject(PLAYBACK_REDIS) private readonly redis: Redis) {}

  async execute(command: SetPlaybackStateCommand): Promise<PlaybackState> {
    const state: PlaybackStatePayload = {
      ...command.request.state,
      sessionId: command.sessionId,
      userId: command.userId,
    };

    const key = `state:${command.userId}`;
    const expectedVersion = command.request.expectedVersion || 0;

    const serialized = PlaybackStatePayloadSchema.safeParse(state);
    if (!serialized.success) {
      this.logger.error(
        `[SetPlaybackStateHandler] Zod validation failed:`,
        JSON.stringify(serialized.error.issues, null, 2),
      );
      throw new BadRequestException('Data sent was not valid.');
    }

    for (let attempt = 0; attempt < ATOMIC_SET_MAX_ATTEMPTS; attempt++) {
      try {
        await this.redis.watch(key);
      } catch (error) {
        await this.redis.unwatch();
        this.logger.error(`[SetPlaybackStateHandler] Redis error:`, JSON.stringify(error, null, 2));
        throw new InternalServerErrorException('Failed to set playback state.');
      }

      const raw = await this.redis.get(key);
      if (expectedVersion === 0 && !raw) {
        const firstState: PlaybackState = {
          ...serialized.data,
          sessionId: command.sessionId,
          userId: command.userId,
          version: 1,
          updatedAt: new Date().toISOString(),
        };

        let execResult: [error: Error | null, result: unknown][] | null;
        try {
          execResult = await this.redis.multi().set(key, JSON.stringify(firstState)).exec();
        } catch (error) {
          await this.redis.unwatch();
          this.logger.error(
            `[SetPlaybackStateHandler] Redis error:`,
            JSON.stringify(error, null, 2),
          );
          throw new InternalServerErrorException('Failed to set playback state.');
        }

        if (execResult === null) {
          continue;
        }

        return firstState;
      } else if (!raw) {
        await this.redis.unwatch();
        this.logger.error(
          `[SetPlaybackStateHandler] Playback state not found for user ${command.userId}`,
        );
        throw new NotFoundException('Playback state not found for user ' + command.userId);
      } else if (raw && expectedVersion === 0) {
        await this.redis.unwatch();
        this.logger.error(
          `[SetPlaybackStateHandler] Playback state found for user ${command.userId} but expected version is 0`,
        );
        throw new ConflictException('Playback state already exists for user ' + command.userId);
      }

      const currentStateParse = PlaybackStateSchema.safeParse(JSON.parse(raw));
      if (!currentStateParse.success) {
        await this.redis.unwatch();
        this.logger.error(
          `[SetPlaybackStateHandler] Zod validation failed:`,
          JSON.stringify(currentStateParse.error.issues, null, 2),
        );
        throw new InternalServerErrorException('Failed to parse playback state.');
      }

      const currentState = currentStateParse.data;
      if (currentState.version !== expectedVersion) {
        await this.redis.unwatch();
        this.logger.error(
          `[SetPlaybackStateHandler] Expected version mismatch:`,
          JSON.stringify(currentState.version, null, 2),
        );
        throw new ConflictException('Expected version mismatch');
      }

      const bumped: PlaybackState = {
        ...currentState,
        ...serialized.data,
        version: currentState.version + 1,
        updatedAt: new Date().toISOString(),
      };

      let execResult: [error: Error | null, result: unknown][] | null;
      try {
        execResult = await this.redis.multi().set(key, JSON.stringify(bumped)).exec();
      } catch (error) {
        await this.redis.unwatch();
        this.logger.error(`[SetPlaybackStateHandler] Redis error:`, JSON.stringify(error, null, 2));
        throw new InternalServerErrorException('Failed to set playback state.');
      }

      if (execResult === null) {
        await this.redis.unwatch();
        continue;
      }

      return bumped;
    }

    await this.redis.unwatch();
    throw new ServiceUnavailableException(
      'Playback state could not be saved due to concurrent updates; please retry.',
    );
  }
}
