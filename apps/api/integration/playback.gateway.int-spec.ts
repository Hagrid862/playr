import { INestApplication } from '@nestjs/common';
import type { PlaybackState } from '@repo/contracts';
import { userBuilder } from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import { TokenService } from '../src/features/auth/services/token.service';
import { PlaybackGateway } from '../src/features/playback/playback.gateway';
import { RedisProvider } from '../src/features/playback/utils/redis.provider';
import { createFakePlaybackRedis } from './fake-playback-redis';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';

const USER_ID = 'user-playback-int';
const SESSION_ID = 'session-playback-int';

function createPlaybackSocket(params: {
  userId: string;
  sessionId: string;
  playbackDeviceId: string;
  playbackDeviceName?: string;
  playbackDeviceIcon?: PlaybackState['deviceIcon'];
}) {
  const broadcast = { emit: vi.fn() };
  return {
    data: {
      user: {
        user: { id: params.userId },
        sessionId: params.sessionId,
      },
      playbackDeviceId: params.playbackDeviceId,
      playbackDeviceName: params.playbackDeviceName ?? 'Web Player',
      playbackDeviceIcon: params.playbackDeviceIcon ?? 'desktop',
    },
    join: vi.fn(),
    disconnect: vi.fn(),
    to: vi.fn().mockReturnValue(broadcast),
    broadcast,
  };
}

const minimalPlaybackStateFields = {
  deviceName: 'Web Player',
  deviceIcon: 'desktop' as const,
  isPlaying: false,
  trackData: {
    id: 'track-1',
    trackId: 'track-1',
    title: 'Track 1',
    artists: ['Artist 1'],
    albumName: 'Album 1',
    albumId: 'album-1',
    albumArt: 'art.png',
    duration: 180,
    explicit: false,
  },
  queue: [] as PlaybackState['queue'],
  currentTime: 0,
  volume: 1,
  repeatMode: 'off' as const,
  shuffle: false,
  favorited: 'not-set' as const,
  inLibrary: false,
};

describe('PlaybackGateway (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let gateway: PlaybackGateway;
  let fakeRedis: ReturnType<typeof createFakePlaybackRedis>;

  beforeAll(async () => {
    fakeRedis = createFakePlaybackRedis();
    const tokenServiceMock = {
      authenticateWithAccessToken: vi.fn().mockResolvedValue({
        user: userBuilder({ id: USER_ID, username: 'playback-int' }),
        sessionId: SESSION_ID,
      }),
    };

    const setup = await createIntegrationApp((builder) =>
      builder
        .overrideProvider(RedisProvider)
        .useValue({
          client: fakeRedis,
          onModuleDestroy: async () => {},
        })
        .overrideProvider(TokenService)
        .useValue(tokenServiceMock),
    );
    app = setup.app;
    prismaMock = setup.prismaMock;
    gateway = app.get(PlaybackGateway);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fakeRedis.reset();
    setupJwtAuthPrismaMocks(prismaMock, {
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('query:get-state returns null when no playback state exists', async () => {
    const socket = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });

    const result = await gateway.handleGetPlayback(socket as never);

    expect(result).toBeNull();
  });

  it('command:set-state creates state and sets active device when claimActiveDevice is true', async () => {
    const socket = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });

    const created = await gateway.handleSetPlayback(socket as never, {
      state: { ...minimalPlaybackStateFields },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    expect(created.version).toBe(1);
    expect(created.activeDeviceId).toBe('device-a');
    expect(created.userId).toBe(USER_ID);

    expect(socket.broadcast.emit).toHaveBeenCalledWith('event:playback-state-updated', created);
  });

  it('command:set-current-time-state bumps version and emits current-time event', async () => {
    const socket = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });

    await gateway.handleSetPlayback(socket as never, {
      state: { ...minimalPlaybackStateFields },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    vi.mocked(socket.broadcast.emit).mockClear();

    const updated = await gateway.handleSetCurrentTimeState(socket as never, {
      currentTime: 42,
      expectedVersion: 1,
    });

    expect(updated.currentTime).toBe(42);
    expect(updated.version).toBe(2);

    expect(socket.broadcast.emit).toHaveBeenCalledWith('event:current-time-updated', {
      currentTime: 42,
      version: 2,
    });
    expect(socket.broadcast.emit).not.toHaveBeenCalledWith(
      'event:playback-state-updated',
      expect.any(Object),
    );
  });

  it('query:list-devices marks active and current device from state and socket context', async () => {
    const socketD1 = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-d1',
      playbackDeviceName: 'Desktop',
    });
    const socketD2 = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-d2',
      playbackDeviceName: 'Phone',
      playbackDeviceIcon: 'mobile',
    });

    await gateway.handleConnection(socketD1 as never);
    await gateway.handleConnection(socketD2 as never);

    await gateway.handleSetPlayback(socketD1 as never, {
      state: { ...minimalPlaybackStateFields },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    const list = await gateway.handleListDevices(socketD2 as never);

    expect(list.devices).toHaveLength(2);

    const desktop = list.devices.find((d) => d.deviceId === 'device-d1');
    const phone = list.devices.find((d) => d.deviceId === 'device-d2');

    expect(desktop?.isActive).toBe(true);
    expect(desktop?.isCurrentDevice).toBe(false);
    expect(phone?.isActive).toBe(false);
    expect(phone?.isCurrentDevice).toBe(true);
  });
});
