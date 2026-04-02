import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PLAYBACK_HISTORY_MAX_LENGTH,
  PlaybackState,
  PlaybackStatePayload,
  PlaybackStatePayloadSchema,
} from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlaybackStateCommand } from './../impl/set-playback-state.command';

@CommandHandler(SetPlaybackStateCommand)
export class SetPlaybackStateHandler implements ICommandHandler<SetPlaybackStateCommand> {
  private readonly logger = new Logger(SetPlaybackStateHandler.name);

  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetPlaybackStateCommand): Promise<PlaybackState> {
    const state: PlaybackStatePayload = {
      ...command.request.state,
      userId: command.userId,
    };

    const { expectedVersion = 0, claimActiveDevice = true } = command.request;

    const serialized = PlaybackStatePayloadSchema.safeParse(state);
    if (!serialized.success) {
      this.logger.error(
        `[SetPlaybackStateHandler] Zod validation failed:`,
        JSON.stringify(serialized.error.issues, null, 2),
      );
      throw new BadRequestException('Data sent was not valid.');
    }

    const payload: PlaybackStatePayload = {
      ...serialized.data,
      history: serialized.data.history.slice(0, PLAYBACK_HISTORY_MAX_LENGTH),
    };

    if (expectedVersion === 0) {
      const firstState = claimActiveDevice
        ? {
            ...payload,
            activeDeviceId: command.playbackDeviceId,
          }
        : payload;
      return this.persistence.createIfAbsent(command.userId, firstState);
    } else {
      return this.persistence.applyMutation(command.userId, expectedVersion, (current) => ({
        ...current,
        ...payload,
        devices: payload.devices.length > 0 ? payload.devices : current.devices,
        activeDeviceId: claimActiveDevice ? command.playbackDeviceId : current.activeDeviceId,
      }));
    }
  }
}
