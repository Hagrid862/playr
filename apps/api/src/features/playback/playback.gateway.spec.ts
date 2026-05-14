import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { TokenService } from '@/features/auth/services/token.service';
import { UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { WsException } from '@nestjs/websockets';
import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Server } from 'socket.io';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { PlaybackGateway } from './playback.gateway';
import { PlaybackDeviceRegistryService } from './services/playback-device-registry.service';

vi.mock('@/common/utils/ws.util', () => ({
  extractAccessTokenFromSocket: vi.fn(),
}));

describe('PlaybackGateway', () => {
  let gateway: PlaybackGateway;
  let commandBus: DeepMocked<CommandBus>;
  let queryBus: DeepMocked<QueryBus>;
  let tokenService: DeepMocked<TokenService>;
  let playbackDeviceRegistry: DeepMocked<PlaybackDeviceRegistryService>;
  let server: DeepMocked<Server>;

  const mockPlaybackState: PlaybackState = {
    sessionId: 'session-1',
    userId: 'user-1',
    activeDeviceId: 'device-1',
    deviceName: 'Web Player',
    deviceIcon: 'desktop',
    isPlaying: false,
    trackData: {
      id: 'track-1',
      title: 'Track 1',
      trackId: 'track-1',
      artists: ['Artist 1'],
      albumName: 'Album 1',
      albumId: 'album-1',
      albumArt: 'art.png',
      duration: 180,
      explicit: false,
    },
    queue: [],
    currentTime: 0,
    volume: 1,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    commandBus = createMock<CommandBus>();
    queryBus = createMock<QueryBus>();
    tokenService = createMock<TokenService>();
    playbackDeviceRegistry = createMock<PlaybackDeviceRegistryService>();
    server = createMock<Server>();

    gateway = new PlaybackGateway(commandBus, queryBus, tokenService, playbackDeviceRegistry);
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

    it('should skip removal if data is missing', async () => {
      const mockSocket = { data: {} } as any;

      await gateway.handleDisconnect(mockSocket);

      expect(playbackDeviceRegistry.removeDevice).not.toHaveBeenCalled();
    });
  });

  describe('Playback Events', () => {
    let mockSocket: any;

    beforeEach(() => {
      mockSocket = {
        data: {
          user: { user: { id: 'u1' }, sessionId: 's1' },
          playbackDeviceId: 'd1',
          playbackDeviceName: 'Web Player',
          playbackDeviceIcon: 'desktop',
        },
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
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

    it('handleSetPlayback should dispatch command and broadcast state', async () => {
      commandBus.execute.mockResolvedValue(mockPlaybackState);

      const data = { isPlaying: true };
      const result = await gateway.handleSetPlayback(mockSocket, data as any);

      expect(commandBus.execute).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalledWith('user:u1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'event:playback-state-updated',
        mockPlaybackState,
      );
      expect(result).toEqual(mockPlaybackState);
    });

    it('handleSetCurrentTimeState should broadcast only current-time-updated event', async () => {
      commandBus.execute.mockResolvedValue(mockPlaybackState);

      const data = { currentTime: 100 };
      const result = await gateway.handleSetCurrentTimeState(mockSocket, data as any);

      expect(mockSocket.emit).toHaveBeenCalledWith('event:current-time-updated', {
        currentTime: mockPlaybackState.currentTime,
        version: mockPlaybackState.version,
      });
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'event:playback-state-updated',
        expect.any(Object),
      );
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
