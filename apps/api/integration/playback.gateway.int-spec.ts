import { INestApplication } from '@nestjs/common';
import type { PlaybackDevice, PlaybackState } from '@repo/contracts';
import { userBuilder } from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import { TokenService } from '../src/features/auth/services/token.service';
import { PlaybackGateway } from '../src/features/playback/playback.gateway';
import type { FakePlaybackRedis } from './fake-playback-redis';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';

const USER_ID = 'user-playback-int';
const SESSION_ID = 'session-playback-int';

function createPlaybackSocket(params: {
  userId: string;
  sessionId: string;
  playbackDeviceId: string;
  playbackDeviceName?: string;
  playbackDeviceIcon?: PlaybackDevice['icon'];
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

/** Include `devices` so persisted state matches registry entries (see `PlaybackDeviceSchema`). */
const minimalPlaybackStateFields = {
  devices: [
    { id: 'device-a', name: 'Web Player', icon: 'desktop' as const },
  ] satisfies PlaybackState['devices'],
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
  history: [] as PlaybackState['history'],
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
  let fakeRedis: FakePlaybackRedis;

  beforeAll(async () => {
    const tokenServiceMock = {
      authenticateWithAccessToken: vi.fn().mockResolvedValue({
        user: userBuilder({ id: USER_ID, username: 'playback-int' }),
        sessionId: SESSION_ID,
      }),
    };

    const setup = await createIntegrationApp((builder) =>
      builder.overrideProvider(TokenService).useValue(tokenServiceMock),
    );
    app = setup.app;
    prismaMock = setup.prismaMock;
    fakeRedis = setup.playbackRedis;
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
      state: {
        ...minimalPlaybackStateFields,
        devices: [
          { id: 'device-d1', name: 'Desktop', icon: 'desktop' },
          { id: 'device-d2', name: 'Phone', icon: 'mobile' },
        ],
      },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    const list = await gateway.handleListDevices(socketD2 as never);

    const desktop = list.devices.find((d) => d.id === 'device-d1');
    const phone = list.devices.find((d) => d.id === 'device-d2');

    expect(desktop?.isActive).toBe(true);
    expect(desktop?.isCurrentDevice).toBe(false);
    expect(phone?.isActive).toBe(false);
    expect(phone?.isCurrentDevice).toBe(true);
  });

  it('command:presence-touch registers or updates device and returns ok', async () => {
    const socket = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });

    const result = await gateway.handlePresenceTouch(socket as never);
    expect(result.ok).toBe(true);
    expect(result.serverTime).toBeDefined();
  });

  it('query:get-queue returns queue state', async () => {
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

    const result = await gateway.handleGetQueue(socket as never);
    expect(result).toBeDefined();
    expect(result?.items).toEqual([]);
  });

  it('command:set-playing-state updates playing flag and versions state', async () => {
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

    const result = await gateway.handleSetPlayingState(socket as never, {
      isPlaying: true,
      expectedVersion: 1,
    });

    expect(result.isPlaying).toBe(true);
    expect(result.version).toBe(2);
    expect(socket.broadcast.emit).toHaveBeenCalledWith('event:playback-state-updated', result);
  });

  it('command:set-active-device transfers active device status', async () => {
    const socketA = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });
    const socketB = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-b',
    });

    await gateway.handleConnection(socketA as never);
    await gateway.handleConnection(socketB as never);

    await gateway.handleSetPlayback(socketA as never, {
      state: { ...minimalPlaybackStateFields },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    const result = await gateway.handleSetActiveDevice(socketA as never, {
      deviceId: 'device-b',
      expectedVersion: 1,
    });

    expect(result.activeDeviceId).toBe('device-b');
    expect(result.version).toBe(2);
  });

  it('command:set-repeat-state updates repeat mode', async () => {
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

    const result = await gateway.handleSetRepeatState(socket as never, {
      repeatMode: 'one',
      expectedVersion: 1,
    });

    expect(result.repeatMode).toBe('one');
    expect(result.version).toBe(2);
  });

  it('command:set-shuffle-state updates shuffle state', async () => {
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

    const result = await gateway.handleSetShuffleState(socket as never, {
      shuffle: true,
      expectedVersion: 1,
    });

    expect(result.shuffle).toBe(true);
    expect(result.version).toBe(2);
  });

  it('command:set-volume-level-state updates volume state', async () => {
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

    const result = await gateway.handleSetVolumeLevelState(socket as never, {
      volume: 0.5,
      expectedVersion: 1,
    });

    expect(result.volume).toBe(0.5);
    expect(result.version).toBe(2);
  });

  it('command:set-favorite-state updates favorited marker', async () => {
    const socket = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });

    prismaMock.client.library.findUnique.mockResolvedValue({ id: 'library-123' } as any);
    prismaMock.client.libraryTrack.findFirst.mockResolvedValue({ id: 'link-123' } as any);
    prismaMock.client.playlist.findFirst.mockResolvedValue({ id: 'favorites-123' } as any);
    prismaMock.client.playlistTrack.findUnique.mockResolvedValue(null);
    prismaMock.client.playlistTrack.aggregate.mockResolvedValue({
      _max: { order: -1 },
      _count: undefined,
      _sum: undefined,
      _avg: undefined,
      _min: undefined,
    });
    prismaMock.client.playlistTrack.create.mockResolvedValue({} as any);

    await gateway.handleSetPlayback(socket as never, {
      state: { ...minimalPlaybackStateFields },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    const result = await gateway.handleSetFavoriteState(socket as never, {
      favorite: 'favorited',
      expectedVersion: 1,
    });

    expect(result.favorited).toBe('favorited');
    expect(result.version).toBe(2);
  });

  it('command:set-library-state updates library status', async () => {
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

    const result = await gateway.handleSetLibraryState(socket as never, {
      inLibrary: true,
      expectedVersion: 1,
    });

    expect(result.inLibrary).toBe(true);
    expect(result.version).toBe(2);
  });

  it('command:add-queue-item appends an item to the play queue', async () => {
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

    const newQueueItem = {
      queueId: '1ec7c000-0000-6000-8000-000000000000',
      track: {
        id: 'queue-item-id-1',
        trackId: 'track-2',
        title: 'Track 2',
        artists: ['Artist 2'],
        albumName: 'Album 2',
        albumId: 'album-2',
        albumArt: 'art2.png',
        duration: 200,
        explicit: true,
      },
      position: 0,
      type: 'queue' as const,
      originalPosition: 0,
    };

    const result = await gateway.handleAddQueueItem(socket as never, {
      track: newQueueItem,
      expectedVersion: 1,
      position: null,
    });

    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].track.title).toBe('Track 2');
    expect(result.version).toBe(2);
  });

  it('command:clear-queue empties the play queue', async () => {
    const socket = createPlaybackSocket({
      userId: USER_ID,
      sessionId: SESSION_ID,
      playbackDeviceId: 'device-a',
    });

    await gateway.handleSetPlayback(socket as never, {
      state: {
        ...minimalPlaybackStateFields,
        queue: [
          {
            queueId: '1ec7c000-0000-6000-8000-000000000001',
            track: {
              id: 'pt-1',
              trackId: 'track-2',
              title: 'Track 2',
              artists: ['Artist 2'],
              albumName: 'Album 2',
              albumId: 'album-2',
              albumArt: 'art2.png',
              duration: 200,
              explicit: true,
            },
            position: 0,
            type: 'queue' as const,
            originalPosition: 0,
          },
        ],
      },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    const result = await gateway.handleClearQueue(socket as never, {
      expectedVersion: 1,
    });

    expect(result.queue).toHaveLength(0);
    expect(result.version).toBe(2);
  });
});
