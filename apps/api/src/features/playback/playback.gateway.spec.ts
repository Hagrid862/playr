import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { TokenService } from '@/features/auth/services/token.service';
import { UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { WsException } from '@nestjs/websockets';
import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Server } from 'socket.io';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PlaybackGateway } from './playback.gateway';
import { PlaybackDeviceRegistryService } from './services/playback-device-registry.service';
import { PlaybackStatePersistenceService } from './services/playback-state-persistence.service';
import { playbackStateFixture } from './test-utils/playback-state.fixture';

vi.mock('@/common/utils/ws.util', () => ({
  extractAccessTokenFromSocket: vi.fn(),
}));

describe('PlaybackGateway', () => {
  let gateway: PlaybackGateway;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;
  let tokenService: DeepMocked<TokenService>;
  let playbackDeviceRegistry: DeepMocked<PlaybackDeviceRegistryService>;
  let playbackPersistence: DeepMocked<PlaybackStatePersistenceService>;
  let server: DeepMocked<Server>;

  const mockPlaybackState: PlaybackState = playbackStateFixture();

  beforeEach(() => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();
    tokenService = createMock<TokenService>();
    playbackDeviceRegistry = createMock<PlaybackDeviceRegistryService>();
    playbackPersistence = createMock<PlaybackStatePersistenceService>();
    server = createMock<Server>();

    playbackPersistence.pauseAndClearActiveIfDeviceMatches.mockResolvedValue(null);

    gateway = new PlaybackGateway(
      commandBus,
      queryBus,
      tokenService,
      playbackDeviceRegistry,
      playbackPersistence,
    );
    gateway.server = server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should register a middleware that authenticates and extracts device info', async () => {
      // Arrange
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });

      gateway.afterInit(server);
      expect(server.use).toHaveBeenCalledWith(expect.any(Function));

      const mockSocket = {
        handshake: {
          auth: { playbackDeviceId: 'd1', deviceName: 'My Phone', deviceIcon: 'mobile' },
        },
        data: {},
      } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue('valid-token');
      tokenService.authenticateWithAccessToken.mockResolvedValue({
        user: { id: 'u1' } as any,
        sessionId: 's1',
      });

      // Act
      await mockMiddleware(mockSocket, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
      expect(mockSocket.data.user).toEqual({ user: { id: 'u1' }, sessionId: 's1' });
      expect(mockSocket.data.playbackDeviceId).toBe('d1');
      expect(mockSocket.data.playbackDeviceName).toBe('My Phone');
      expect(mockSocket.data.playbackDeviceIcon).toBe('mobile');
    });

    it('should use default device name and icon if not provided', async () => {
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });
      gateway.afterInit(server);

      const mockSocket = {
        handshake: { auth: { playbackDeviceId: 'd1' } },
        data: {},
      } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue('token');
      tokenService.authenticateWithAccessToken.mockResolvedValue({
        user: { id: 'u1' } as any,
        sessionId: 's1',
      });

      await mockMiddleware(mockSocket, next);

      expect(mockSocket.data.playbackDeviceName).toBe('Web Player');
      expect(mockSocket.data.playbackDeviceIcon).toBe('desktop');
    });

    it('should call next with error if token is missing', async () => {
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });
      gateway.afterInit(server);

      const mockSocket = { handshake: { auth: {} }, data: {} } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue(undefined);

      await mockMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Unauthorized: No token provided');
    });

    it('should call next with error if playbackDeviceId is missing', async () => {
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });
      gateway.afterInit(server);

      const mockSocket = { handshake: { auth: {} }, data: {} } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue('token');
      tokenService.authenticateWithAccessToken.mockResolvedValue({
        user: { id: 'u1' } as any,
        sessionId: 's1',
      });

      await mockMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Unauthorized: Missing playback device ID');
    });

    it('should handle UnauthorizedException from token service', async () => {
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });
      gateway.afterInit(server);

      const mockSocket = { handshake: { auth: { playbackDeviceId: 'd1' } }, data: {} } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue('token');
      tokenService.authenticateWithAccessToken.mockRejectedValue(
        new UnauthorizedException('Token expired'),
      );

      await mockMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Token expired');
    });

    it('should handle generic errors during handshake', async () => {
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });
      gateway.afterInit(server);

      const mockSocket = { handshake: { auth: { playbackDeviceId: 'd1' } }, data: {} } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue('token');
      tokenService.authenticateWithAccessToken.mockRejectedValue(new Error('DB exploded'));

      await mockMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Internal server error');
    });

    it('should handle non-Error catch during handshake', async () => {
      const mockMiddleware = vi.fn();
      server.use.mockImplementation((fn: any) => {
        mockMiddleware.mockImplementation(fn);
        return server;
      });
      gateway.afterInit(server);

      const mockSocket = { handshake: { auth: { playbackDeviceId: 'd1' } }, data: {} } as any;
      const next = vi.fn();
      (extractAccessTokenFromSocket as Mock).mockReturnValue('token');
      // Reject with a plain string instead of an Error object
      tokenService.authenticateWithAccessToken.mockRejectedValue('String error');

      await mockMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Internal server error');
    });
  });

  describe('handleConnection', () => {
    it('should join user room and register device on valid connection', async () => {
      const mockSocket = {
        data: {
          user: { user: { id: 'u1' } },
          playbackDeviceId: 'd1',
          playbackDeviceName: 'name',
          playbackDeviceIcon: 'mobile',
        },
        join: vi.fn(),
      } as any;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('user:u1');
      expect(playbackDeviceRegistry.registerOrUpdateDevice).toHaveBeenCalledWith('u1', {
        deviceId: 'd1',
        deviceName: 'name',
        deviceIcon: 'mobile',
      });
    });

    it('should disconnect if required data is missing', async () => {
      const mockSocket = {
        data: { user: { user: { id: 'u1' } } },
        disconnect: vi.fn(),
      } as any;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(playbackDeviceRegistry.registerOrUpdateDevice).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove device if user and device info is present', async () => {
      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(playbackDeviceRegistry.removeDevice).toHaveBeenCalledWith('u1', 'd1');
    });

    it('should broadcast paused state when disconnecting active device', async () => {
      const updated = playbackStateFixture({
        activeDeviceId: null,
        isPlaying: false,
        version: 2,
      });
      playbackPersistence.pauseAndClearActiveIfDeviceMatches.mockResolvedValue(updated);
      const roomEmit = vi.fn();
      server.to.mockReturnValue({ emit: roomEmit } as any);

      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(playbackPersistence.pauseAndClearActiveIfDeviceMatches).toHaveBeenCalledWith(
        'u1',
        'd1',
      );
      expect(server.to).toHaveBeenCalledWith('user:u1');
      expect(roomEmit).toHaveBeenCalledWith('event:playback-state-updated', updated);
    });

    it('should still pause and broadcast when removeDevice throws', async () => {
      playbackDeviceRegistry.removeDevice.mockRejectedValue(new Error('registry failure'));
      const updated = playbackStateFixture({
        activeDeviceId: null,
        isPlaying: false,
        version: 2,
      });
      playbackPersistence.pauseAndClearActiveIfDeviceMatches.mockResolvedValue(updated);
      const roomEmit = vi.fn();
      server.to.mockReturnValue({ emit: roomEmit } as any);

      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(playbackPersistence.pauseAndClearActiveIfDeviceMatches).toHaveBeenCalledWith(
        'u1',
        'd1',
      );
      expect(roomEmit).toHaveBeenCalledWith('event:playback-state-updated', updated);
    });

    it('should not broadcast playback-state-updated when pause returns null', async () => {
      const roomEmit = vi.fn();
      server.to.mockReturnValue({ emit: roomEmit } as any);
      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;
      await gateway.handleDisconnect(mockSocket);
      expect(playbackPersistence.pauseAndClearActiveIfDeviceMatches).toHaveBeenCalledWith(
        'u1',
        'd1',
      );
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it('should skip removal if data is missing', async () => {
      const mockSocket = { data: {} } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(playbackDeviceRegistry.removeDevice).not.toHaveBeenCalled();
    });

    it('should log warning if removeDevice throws non-Error', async () => {
      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;
      playbackDeviceRegistry.removeDevice.mockRejectedValue('registry string error');
      const loggerWarnSpy = vi.spyOn((gateway as any).logger, 'warn');

      await gateway.handleDisconnect(mockSocket);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Playback disconnect removeDevice failed for user u1: registry string error',
        ),
      );
      loggerWarnSpy.mockRestore();
    });

    it('should log warning if pauseAndClearActiveIfDeviceMatches throws', async () => {
      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;
      playbackPersistence.pauseAndClearActiveIfDeviceMatches.mockRejectedValue(
        new Error('pause failed'),
      );
      const loggerWarnSpy = vi.spyOn((gateway as any).logger, 'warn');

      await gateway.handleDisconnect(mockSocket);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Playback disconnect pause failed for user u1: pause failed'),
      );
      loggerWarnSpy.mockRestore();
    });

    it('should handle non-Error catch in pauseAndClearActiveIfDeviceMatches', async () => {
      const mockSocket = {
        data: { user: { user: { id: 'u1' } }, playbackDeviceId: 'd1' },
      } as any;
      playbackPersistence.pauseAndClearActiveIfDeviceMatches.mockRejectedValue('string error');
      const loggerWarnSpy = vi.spyOn((gateway as any).logger, 'warn');

      await gateway.handleDisconnect(mockSocket);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Playback disconnect pause failed for user u1: string error'),
      );
      loggerWarnSpy.mockRestore();
    });
  });

  describe('Playback Events', () => {
    let mockSocket: any;
    let roomEmit: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      roomEmit = vi.fn();
      server.to.mockReturnValue({ emit: roomEmit } as any);
      mockSocket = {
        data: {
          user: { user: { id: 'u1' }, sessionId: 's1' },
          playbackDeviceId: 'd1',
          playbackDeviceName: 'Web Player',
          playbackDeviceIcon: 'desktop',
        },
        to: vi.fn().mockReturnValue({ emit: roomEmit }),
      };
    });

    it('handleGetPlayback should return current state', async () => {
      queryBus.execute.mockResolvedValue(mockPlaybackState);

      const result = await gateway.handleGetPlayback(mockSocket);

      expect(result).toEqual(mockPlaybackState);
      expect(queryBus.execute).toHaveBeenCalled();
    });

    it('handleGetQueue should return queue state', async () => {
      const mockQueue = { queue: [] };
      queryBus.execute.mockResolvedValue(mockQueue);

      const result = await gateway.handleGetQueue(mockSocket);

      expect(result).toEqual(mockQueue);
    });

    it('handleListDevices should return registered devices', async () => {
      queryBus.execute.mockResolvedValue({ activeDeviceId: 'd1' });
      playbackDeviceRegistry.listDevices.mockResolvedValue({ devices: [] } as any);

      const result = await gateway.handleListDevices(mockSocket);

      expect(playbackDeviceRegistry.listDevices).toHaveBeenCalledWith('u1', 'd1', 'd1');
      expect(result).toEqual({ devices: [] });
    });

    it('handleListDevices should fallback to empty activeDeviceId if state is missing it', async () => {
      queryBus.execute.mockResolvedValue(null);
      playbackDeviceRegistry.listDevices.mockResolvedValue({ devices: [] } as any);

      await gateway.handleListDevices(mockSocket);

      expect(playbackDeviceRegistry.listDevices).toHaveBeenCalledWith('u1', '', 'd1');
    });

    it('handlePresenceTouch should refresh device registry and return ack', async () => {
      const result = await gateway.handlePresenceTouch(mockSocket);

      expect(playbackDeviceRegistry.registerOrUpdateDevice).toHaveBeenCalledWith('u1', {
        deviceId: 'd1',
        deviceName: 'Web Player',
        deviceIcon: 'desktop',
      });
      expect(result).toEqual({ ok: true, serverTime: expect.any(String) });
    });

    it('emitPlaybackStateToUserRoom and emitPlaybackSessionEndedToUserRoom use server room', () => {
      gateway.emitPlaybackStateToUserRoom('u1', mockPlaybackState);
      expect(server.to).toHaveBeenCalledWith('user:u1');
      expect(roomEmit).toHaveBeenCalledWith('event:playback-state-updated', mockPlaybackState);

      vi.mocked(server.to).mockClear();
      roomEmit.mockClear();

      gateway.emitPlaybackSessionEndedToUserRoom('u1');
      expect(server.to).toHaveBeenCalledWith('user:u1');
      expect(roomEmit).toHaveBeenCalledWith('event:playback-session-ended', {});
    });

    it('handleSetPlayback should dispatch command and broadcast state', async () => {
      commandBus.execute.mockResolvedValue(mockPlaybackState);

      const data = { isPlaying: true };
      const result = await gateway.handleSetPlayback(mockSocket, data as any);

      expect(commandBus.execute).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalledWith('user:u1');
      expect(roomEmit).toHaveBeenCalledWith('event:playback-state-updated', mockPlaybackState);
      expect(result).toEqual(mockPlaybackState);
    });

    it('handleSetCurrentTimeState should broadcast only current-time-updated event', async () => {
      commandBus.execute.mockResolvedValue(mockPlaybackState);

      const data = { currentTime: 100 };
      const result = await gateway.handleSetCurrentTimeState(mockSocket, data as any);

      expect(roomEmit).toHaveBeenCalledWith('event:current-time-updated', {
        currentTime: mockPlaybackState.currentTime,
        version: mockPlaybackState.version,
      });
      expect(result).toEqual(mockPlaybackState);
    });

    it('should throw WsException if authentication fails in helper method', async () => {
      mockSocket.data.user = null; // simulate invalid auth data on an authenticated event

      await expect(gateway.handleGetPlayback(mockSocket)).rejects.toThrow(WsException);
      await expect(gateway.handleGetPlayback(mockSocket)).rejects.toThrow(
        'Unauthorized: Invalid token',
      );
    });

    it('should test various mutation handlers to hit all lines', async () => {
      commandBus.execute.mockResolvedValue(mockPlaybackState);

      await gateway.handleSetFavoriteState(mockSocket, {} as any);
      await gateway.handleSetLibraryState(mockSocket, {} as any);
      await gateway.handleSetPlayingState(mockSocket, {} as any);
      await gateway.handleSetActiveDevice(mockSocket, {} as any);
      await gateway.handleSetRepeatState(mockSocket, {} as any);
      await gateway.handleSetTrackState(mockSocket, {} as any);
      await gateway.handleSetShuffleState(mockSocket, {} as any);
      await gateway.handleSetVolumeLevelState(mockSocket, {} as any);
      await gateway.handleAddQueueItem(mockSocket, {} as any);
      await gateway.handleSetNextQueueItem(mockSocket, {} as any);
      await gateway.handleSetQueue(mockSocket, {} as any);
      await gateway.handleClearQueue(mockSocket, {} as any);
      await gateway.handleShuffleQueue(mockSocket, {} as any);
      await gateway.handleReorderQueueItems(mockSocket, {} as any);
      await gateway.handleRemoveQueueItem(mockSocket, {} as any);
      await gateway.handleMoveQueueItem(mockSocket, {} as any);

      expect(commandBus.execute).toHaveBeenCalledTimes(16);
    });
  });
});
