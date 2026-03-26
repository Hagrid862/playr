import { BadRequestException, Inject, InternalServerErrorException, Logger } from '@nestjs/common';
import { SetPlaybackStateCommand } from './../impl/set-playback-state.command';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PLAYBACK_REDIS } from '../../utils/playback-redis.constrants';
import Redis from 'ioredis';
import { PlaybackState, PlaybackStateSchema } from '@repo/contracts';

@CommandHandler(SetPlaybackStateCommand)
export class SetPlaybackStateHandler implements ICommandHandler<SetPlaybackStateCommand> {
  private readonly logger = new Logger(SetPlaybackStateHandler.name);

  constructor(@Inject(PLAYBACK_REDIS) private readonly redis: Redis) {}

  async execute(command: SetPlaybackStateCommand): Promise<PlaybackState> {
    const state: PlaybackState = {
      ...command.state.state,
      sessionId: command.sessionId,
      userId: command.userId,
    };

    const key = `state:${command.userId}`;
    const serialized = PlaybackStateSchema.safeParse(state);

    if (!serialized.success) {
      this.logger.error(
        `[SetPlaybackStateHandler] Zod validation failed:`,
        JSON.stringify(serialized.error.issues, null, 2),
      );
      throw new BadRequestException('Data sent was not valid.');
    }

    try {
      await this.redis.set(key, JSON.stringify(serialized.data));

      return serialized.data;
    } catch (error) {
      this.logger.error(`Failed to set playback state for user ${command.userId}: ${error}`);
      throw new InternalServerErrorException(
        'Failed to set playback state for user ' + command.userId,
      );
    }
  }
}
