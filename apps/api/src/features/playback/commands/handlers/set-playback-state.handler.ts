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
      activeDeviceId: '',
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
      const firstState = command.request.claimActiveDevice
        ? {
            ...serialized.data,
            activeDeviceId: command.playbackDeviceId,
            deviceName: command.playbackDeviceName,
            deviceIcon: command.playbackDeviceIcon,
          }
        : serialized.data;
      return this.persistence.createIfAbsent(command.userId, command.sessionId, firstState);
    } else {
      return this.persistence.applyMutation(command.userId, expectedVersion, (current) => ({
        ...current,
        ...serialized.data,
        activeDeviceId: command.request.claimActiveDevice
          ? command.playbackDeviceId
          : current.activeDeviceId,
        deviceName: command.request.claimActiveDevice
          ? command.playbackDeviceName
          : serialized.data.deviceName,
        deviceIcon: command.request.claimActiveDevice
          ? command.playbackDeviceIcon
          : serialized.data.deviceIcon,
      }));
    }
  }
}
