import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PLAYBACK_HISTORY_MAX_LENGTH,
  PlaybackState,
  PlaybackStatePayload,
  PlaybackStatePayloadSchema,
} from '@repo/contracts';
import { PlaybackLibraryFlagsService } from '../../services/playback-library-flags.service';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlaybackStateCommand } from './../impl/set-playback-state.command';

@CommandHandler(SetPlaybackStateCommand)
export class SetPlaybackStateHandler implements ICommandHandler<SetPlaybackStateCommand> {
  private readonly logger = new Logger(SetPlaybackStateHandler.name);

  constructor(
    private readonly persistence: PlaybackStatePersistenceService,
    private readonly libraryFlags: PlaybackLibraryFlagsService,
  ) {}

  private upsertDeviceById(
    devices: PlaybackStatePayload['devices'],
    device: { id: string; name: string; icon: PlaybackStatePayload['devices'][number]['icon'] },
  ): PlaybackStatePayload['devices'] {
    const map = new Map<string, PlaybackStatePayload['devices'][number]>();
    for (const d of devices) map.set(d.id, d);
    map.set(device.id, device);
    return [...map.values()];
  }

  private mergeDevices(
    currentDevices: PlaybackStatePayload['devices'],
    payloadDevices: PlaybackStatePayload['devices'],
    activeDevice: PlaybackStatePayload['devices'][number],
    claimActiveDevice: boolean,
  ): PlaybackStatePayload['devices'] {
    // Update must not drop other connected devices: merge rather than replace.
    const base = currentDevices ?? [];
    if (payloadDevices.length > 0) {
      const map = new Map<string, PlaybackStatePayload['devices'][number]>();
      for (const d of base) map.set(d.id, d);
      for (const d of payloadDevices) map.set(d.id, d);
      if (claimActiveDevice) {
        map.set(activeDevice.id, activeDevice);
      }
      return [...map.values()];
    }

    // If client sent no devices, only inject active device metadata (when claiming).
    return claimActiveDevice ? this.upsertDeviceById(base, activeDevice) : base;
  }

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

    const payloadBase: PlaybackStatePayload = {
      ...serialized.data,
      history: serialized.data.history.slice(0, PLAYBACK_HISTORY_MAX_LENGTH),
    };
    const flags = await this.libraryFlags.resolveForTrack(command.userId, payloadBase.trackData.trackId);
    const payload: PlaybackStatePayload = { ...payloadBase, ...flags };

    const activeDevice: PlaybackStatePayload['devices'][number] = {
      id: command.playbackDeviceId,
      name: command.playbackDeviceName,
      icon: command.playbackDeviceIcon,
    };

    if (expectedVersion === 0) {
      const firstState = claimActiveDevice
        ? {
            ...payload,
            activeDeviceId: command.playbackDeviceId,
            devices: this.upsertDeviceById(payload.devices, activeDevice),
          }
        : payload;
      return this.persistence.createIfAbsent(command.userId, firstState);
    } else {
      return this.persistence.applyMutation(command.userId, expectedVersion, (current) => ({
        ...current,
        ...payload,
        devices: this.mergeDevices(
          current.devices,
          payload.devices,
          activeDevice,
          claimActiveDevice,
        ),
        activeDeviceId: claimActiveDevice ? command.playbackDeviceId : current.activeDeviceId,
      }));
    }
  }
}
