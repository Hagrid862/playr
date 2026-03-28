import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState, PlaybackStatePayload, PlaybackStatePayloadSchema } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlaybackStateCommand } from './../impl/set-playback-state.command';

@CommandHandler(SetPlaybackStateCommand)
export class SetPlaybackStateHandler implements ICommandHandler<SetPlaybackStateCommand> {
  private readonly logger = new Logger(SetPlaybackStateHandler.name);

  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetPlaybackStateCommand): Promise<PlaybackState> {
    const state: PlaybackStatePayload = {
      ...command.request.state,
      sessionId: command.sessionId,
      userId: command.userId,
    };

    const expectedVersion = command.request.expectedVersion ?? 0;

    const serialized = PlaybackStatePayloadSchema.safeParse(state);
    if (!serialized.success) {
      this.logger.error(
        `[SetPlaybackStateHandler] Zod validation failed:`,
        JSON.stringify(serialized.error.issues, null, 2),
      );
      throw new BadRequestException('Data sent was not valid.');
    }

    if (expectedVersion === 0) {
      return this.persistence.createIfAbsent(command.userId, command.sessionId, serialized.data);
    } else {
      return this.persistence.applyMutation(command.userId, expectedVersion, () => serialized.data);
    }
  }
}
