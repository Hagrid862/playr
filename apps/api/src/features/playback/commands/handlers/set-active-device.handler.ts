import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { PlaybackDeviceRegistryService } from '../../services/playback-device-registry.service';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetActiveDeviceCommand } from '../impl/set-active-device.command';

@CommandHandler(SetActiveDeviceCommand)
export class SetActiveDeviceHandler implements ICommandHandler<SetActiveDeviceCommand> {
  constructor(
    private readonly persistence: PlaybackStatePersistenceService,
    private readonly deviceRegistry: PlaybackDeviceRegistryService,
  ) {}

  async execute(command: SetActiveDeviceCommand): Promise<PlaybackState> {
    const { deviceId, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    const device = await this.deviceRegistry.getDevice(command.userId, deviceId);
    if (!device) {
      throw new BadRequestException('Playback device not found.');
    }

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => ({
      ...current,
      activeDeviceId: deviceId,
    }));
  }
}
