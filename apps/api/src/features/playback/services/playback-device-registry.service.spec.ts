import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Redis } from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAYBACK_REDIS } from '../utils/playback-redis.constants';
import { PlaybackDeviceRegistryService } from './playback-device-registry.service';

describe('PlaybackDeviceRegistryService', () => {
  let service: PlaybackDeviceRegistryService;
  let redisMock: DeepMocked<Redis>;

  const userId = 'user-1';
  const deviceId = 'device-1';
  const deviceName = 'My iPhone';
  const deviceIcon = 'mobile' as const;

  beforeEach(async () => {
    redisMock = createMock<Redis>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaybackDeviceRegistryService,
        {
          provide: PLAYBACK_REDIS,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<PlaybackDeviceRegistryService>(PlaybackDeviceRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerOrUpdateDevice', () => {
    it('should store device in redis with hash-set and set expiration', async () => {
      await service.registerOrUpdateDevice(userId, { deviceId, deviceName, deviceIcon });

      expect(redisMock.hset).toHaveBeenCalledWith(
        `playback_devices:${userId}`,
        deviceId,
        expect.stringContaining(deviceId),
      );
      expect(redisMock.expire).toHaveBeenCalledWith(`playback_devices:${userId}`, 90);
    });
  });

  describe('removeDevice', () => {
    it('should delete device from redis hash', async () => {
      await service.removeDevice(userId, deviceId);

      expect(redisMock.hdel).toHaveBeenCalledWith(`playback_devices:${userId}`, deviceId);
    });
  });

  describe('getDevice', () => {
    it('should return parsed device record if it exists', async () => {
      const record = { deviceId, deviceName, deviceIcon, updatedAt: new Date().toISOString() };
      redisMock.hget.mockResolvedValueOnce(JSON.stringify(record));

      const result = await service.getDevice(userId, deviceId);

      expect(result).toEqual(record);
    });

    it('should return null if device record is not found', async () => {
      redisMock.hget.mockResolvedValueOnce(null);

      const result = await service.getDevice(userId, deviceId);

      expect(result).toBeNull();
    });

    it('should return null and log warning on json parse error', async () => {
      const loggerSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      redisMock.hget.mockResolvedValueOnce('invalid-json');

      const result = await service.getDevice(userId, deviceId);

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('listDevices', () => {
    it('should list and enrich devices from redis', async () => {
      const activeId = 'device-1';
      const currentId = 'device-2';
      const devices = [
        { deviceId: 'device-1', deviceName: 'iPhone', deviceIcon: 'iphone' as const },
        { deviceId: 'device-2', deviceName: 'Mac', deviceIcon: 'computer' as const },
      ];
      redisMock.hvals.mockResolvedValueOnce(devices.map((d) => JSON.stringify(d)));

      const result = await service.listDevices(userId, activeId, currentId);

      expect(result.devices).toHaveLength(2);
      expect(result.devices[0].isActive).toBe(true);
      expect(result.devices[0].isCurrentDevice).toBe(false);
      expect(result.devices[1].isActive).toBe(false);
      expect(result.devices[1].isCurrentDevice).toBe(true);
    });

    it('should filter out unparseable items', async () => {
      redisMock.hvals.mockResolvedValueOnce(['{invalid}', JSON.stringify({ deviceId: 'ok' })]);

      const result = await service.listDevices(userId, 'any', 'any');

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].id).toBe('ok');
    });
  });
});
