import { Inject, Injectable, Logger } from '@nestjs/common';
import { ListPlaybackDevicesResponse, PlaybackDevice } from '@repo/contracts';
import Redis from 'ioredis';
import { PLAYBACK_REDIS } from '../utils/playback-redis.constants';

const DEVICE_TTL_SECONDS = 90;

type DeviceIcon = PlaybackDevice['icon'];

type DeviceRecord = {
  deviceId: string;
  deviceName: string;
  /** Same values as `PlaybackDevice.icon`; stored under legacy field name in Redis. */
  deviceIcon: DeviceIcon;
  updatedAt: string;
};

@Injectable()
export class PlaybackDeviceRegistryService {
  private readonly logger = new Logger(PlaybackDeviceRegistryService.name);

  constructor(@Inject(PLAYBACK_REDIS) private readonly redis: Redis) {}

  private getUserDevicesKey(userId: string): string {
    return `playback_devices:${userId}`;
  }

  async registerOrUpdateDevice(
    userId: string,
    device: { deviceId: string; deviceName: string; deviceIcon: DeviceIcon },
  ): Promise<void> {
    const key = this.getUserDevicesKey(userId);
    const payload: DeviceRecord = {
      ...device,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.hset(key, payload.deviceId, JSON.stringify(payload));
    await this.redis.expire(key, DEVICE_TTL_SECONDS);
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    const key = this.getUserDevicesKey(userId);
    await this.redis.hdel(key, deviceId);
  }

  async getDevice(userId: string, deviceId: string): Promise<DeviceRecord | null> {
    const raw = await this.redis.hget(this.getUserDevicesKey(userId), deviceId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DeviceRecord;
    } catch (error) {
      this.logger.warn(`Failed to parse playback device ${deviceId} for user ${userId}: ${error}`);
      return null;
    }
  }

  async listDevices(
    userId: string,
    activeDeviceId: string,
    currentDeviceId: string,
  ): Promise<ListPlaybackDevicesResponse> {
    const values = await this.redis.hvals(this.getUserDevicesKey(userId));
    const devices = values
      .map((raw) => {
        try {
          return JSON.parse(raw) as DeviceRecord;
        } catch {
          return null;
        }
      })
      .filter((item): item is DeviceRecord => item !== null)
      .map((item) => ({
        id: item.deviceId,
        name: item.deviceName,
        icon: item.deviceIcon,
        isActive: item.deviceId === activeDeviceId,
        isCurrentDevice: item.deviceId === currentDeviceId,
      }));

    return { devices };
  }
}
