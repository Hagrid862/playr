import { PlaybackWsExceptionFilter } from '@/common/filters/ws-exception.filter';
import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { Logger, UnauthorizedException, UseFilters, UseGuards } from '@nestjs/common';
import { Command, CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { PlaybackState } from '@repo/contracts';
import { Server, Socket } from 'socket.io';
import { getCorsOrigin } from '../../common/config/cors-config';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { TokenService } from '../auth/services/token.service';
import { AddQueueItemCommand } from './commands/impl/add-queue-item.command';
import { ClearQueueCommand } from './commands/impl/clear-queue.command';
import { MoveQueueItemCommand } from './commands/impl/move-queue-item.command';
import { RemoveQueueItemCommand } from './commands/impl/remove-queue-item.command';
import { ReorderQueueItemsCommand } from './commands/impl/reorder-queue-items.command';
import { SetActiveDeviceCommand } from './commands/impl/set-active-device.command';
import { SetCurrentTimeStateCommand } from './commands/impl/set-current-time-state.command';
import { SetFavoriteStateCommand } from './commands/impl/set-favorite-state.command';
import { SetLibraryStateCommand } from './commands/impl/set-library-state.command';
import { SetNextQueueItemCommand } from './commands/impl/set-next-queue-item.command';
import { SetPlaybackStateCommand } from './commands/impl/set-playback-state.command';
import { SetPlayingStateCommand } from './commands/impl/set-playing-state.command';
import { SetQueueCommand } from './commands/impl/set-queue.command';
import { SetRepeatStateCommand } from './commands/impl/set-repeat-state.command';
import { SetShuffleStateCommand } from './commands/impl/set-shuffle-state.command';
import { SetTrackStateCommand } from './commands/impl/set-track-state.command';
import { SetVolumeLevelStateCommand } from './commands/impl/set-volume-level-state.command';
import { ShuffleQueueCommand } from './commands/impl/shuffle-queue.command';
import { AddQueueItemRequestDto } from './dto/request/add-queue-item.request.dto';
import { ClearQueueRequestDto } from './dto/request/clear-queue.request.dto';
import { MoveQueueItemRequestDto } from './dto/request/move-queue-item.request.dto';
import { RemoveQueueItemRequestDto } from './dto/request/remove-queue-item.request.dto';
import { ReorderQueueItemsRequestDto } from './dto/request/reorder-queue-items.request.dto';
import { SetActiveDeviceRequestDto } from './dto/request/set-active-device.request.dto';
import { SetCurrentTimeStateRequestDto } from './dto/request/set-current-time-state.request.dto';
import { SetFavoriteStateRequestDto } from './dto/request/set-favorite-state.request.dto';
import { SetLibraryStateRequestDto } from './dto/request/set-library-state.request.dto';
import { SetNextQueueItemRequestDto } from './dto/request/set-next-queue-item.request.dto';
import { SetPlaybackStateRequestDto } from './dto/request/set-playback-state.request.dto';
import { SetPlayingStateRequestDto } from './dto/request/set-playing-state.request.dto';
import { SetQueueRequestDto } from './dto/request/set-queue.request.dto';
import { SetRepeatStateRequestDto } from './dto/request/set-repeat-state.request.dto';
import { SetShuffleStateRequestDto } from './dto/request/set-shuffle-state.request.dto';
import { SetTrackStateRequestDto } from './dto/request/set-track-state.request.dto';
import { SetVolumeLevelStateRequestDto } from './dto/request/set-volume-level-state.request.dto';
import { ShuffleQueueRequestDto } from './dto/request/shuffle-queue.request.dto';
import { GetPlaybackStateResponseDto } from './dto/response/get-playback-state.response.dto';
import { GetQueueStateResponseDto } from './dto/response/get-queue-state.response.dto';
import { ListPlaybackDevicesResponseDto } from './dto/response/list-playback-devices.response.dto';
import { SetPlaybackStateResponseDto } from './dto/response/set-playback-state.response.dto';
import { GetPlaybackStateQuery } from './queries/impl/get-playback-state.query';
import { GetQueueStateQuery } from './queries/impl/get-queue-state.query';
import { PlaybackDeviceRegistryService } from './services/playback-device-registry.service';

type DeviceIcon = PlaybackState['deviceIcon'];

type PlaybackSocketContext = {
  userId: string;
  sessionId: string;
  playbackDeviceId: string;
  playbackDeviceName: string;
  playbackDeviceIcon: DeviceIcon;
};

@UseFilters(PlaybackWsExceptionFilter)
@WebSocketGateway({
  namespace: 'playback',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
export class PlaybackGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PlaybackGateway.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
    private readonly playbackDeviceRegistry: PlaybackDeviceRegistryService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = extractAccessTokenFromSocket(socket);
        if (!token) {
          return next(new Error('Unauthorized: No token provided'));
        }
        socket.data.user = await this.tokenService.authenticateWithAccessToken(token);
        const auth = socket.handshake.auth as Record<string, unknown> | undefined;
        const playbackDeviceId =
          typeof auth?.playbackDeviceId === 'string' ? auth.playbackDeviceId : '';
        if (!playbackDeviceId) {
          return next(new Error('Unauthorized: Missing playback device ID'));
        }
        const playbackDeviceName =
          typeof auth?.deviceName === 'string' && auth.deviceName.trim().length > 0
            ? auth.deviceName.trim()
            : 'Web Player';
        const playbackDeviceIcon = this.normalizeDeviceIcon(auth?.deviceIcon);
        socket.data.playbackDeviceId = playbackDeviceId;
        socket.data.playbackDeviceName = playbackDeviceName;
        socket.data.playbackDeviceIcon = playbackDeviceIcon;
        next();
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          return next(new Error(error.message));
        }
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Playback WebSocket handshake: unexpected error — ${err.message}`,
          err.stack,
        );
        return next(new Error('Internal server error'));
      }
    });
  }

  async handleConnection(client: Socket) {
    if (
      !client.data.user ||
      !client.data.playbackDeviceId ||
      !client.data.playbackDeviceName ||
      !client.data.playbackDeviceIcon
    ) {
      client.disconnect(true);
      return;
    }
    const userId = client.data.user.user.id as string;
    await client.join(`user:${userId}`);
    await this.playbackDeviceRegistry.registerOrUpdateDevice(userId, {
      deviceId: client.data.playbackDeviceId as string,
      deviceName: client.data.playbackDeviceName as string,
      deviceIcon: client.data.playbackDeviceIcon as DeviceIcon,
    });
  }

  async handleDisconnect(client: Socket) {
    if (!client.data?.user?.user?.id || !client.data?.playbackDeviceId) return;
    await this.playbackDeviceRegistry.removeDevice(
      client.data.user.user.id as string,
      client.data.playbackDeviceId as string,
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('query:get-state')
  async handleGetPlayback(@ConnectedSocket() client: Socket): Promise<GetPlaybackStateResponseDto> {
    const user = await this.authenticate(client);
    const userId = user.userId;

    const result = await this.queryBus.execute(new GetPlaybackStateQuery(userId));
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('query:get-queue')
  async handleGetQueue(
    @ConnectedSocket() client: Socket,
  ): Promise<GetQueueStateResponseDto | null> {
    const user = await this.authenticate(client);
    const userId = user.userId;

    return this.queryBus.execute(new GetQueueStateQuery(userId));
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('query:list-devices')
  async handleListDevices(
    @ConnectedSocket() client: Socket,
  ): Promise<ListPlaybackDevicesResponseDto> {
    const context = await this.authenticate(client);
    const state = await this.queryBus.execute(new GetPlaybackStateQuery(context.userId));
    const activeDeviceId = state?.activeDeviceId ?? '';
    return this.playbackDeviceRegistry.listDevices(
      context.userId,
      activeDeviceId,
      context.playbackDeviceId,
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-state')
  async handleSetPlayback(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetPlaybackStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) =>
        new SetPlaybackStateCommand(
          context.userId,
          context.sessionId,
          context.playbackDeviceId,
          context.playbackDeviceName,
          context.playbackDeviceIcon,
          data,
        ),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-current-time-state')
  async handleSetCurrentTimeState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetCurrentTimeStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) =>
        new SetCurrentTimeStateCommand(
          context.userId,
          context.sessionId,
          context.playbackDeviceId,
          data,
        ),
      'currentTime',
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-favorite-state')
  async handleSetFavoriteState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetFavoriteStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetFavoriteStateCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-library-state')
  async handleSetLibraryState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetLibraryStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetLibraryStateCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-playing-state')
  async handleSetPlayingState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetPlayingStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) =>
        new SetPlayingStateCommand(
          context.userId,
          context.sessionId,
          context.playbackDeviceId,
          context.playbackDeviceName,
          context.playbackDeviceIcon,
          data,
        ),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-active-device')
  async handleSetActiveDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetActiveDeviceRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetActiveDeviceCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-repeat-state')
  async handleSetRepeatState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetRepeatStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetRepeatStateCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-track-state')
  async handleSetTrackState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetTrackStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetTrackStateCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-shuffle-state')
  async handleSetShuffleState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetShuffleStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetShuffleStateCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-volume-level-state')
  async handleSetVolumeLevelState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetVolumeLevelStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetVolumeLevelStateCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:add-queue-item')
  async handleAddQueueItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AddQueueItemRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new AddQueueItemCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-next-queue-item')
  async handleSetNextQueueItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetNextQueueItemRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetNextQueueItemCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-queue')
  async handleSetQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetQueueRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new SetQueueCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:clear-queue')
  async handleClearQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClearQueueRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new ClearQueueCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:shuffle-queue')
  async handleShuffleQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ShuffleQueueRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new ShuffleQueueCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:reorder-queue-items')
  async handleReorderQueueItems(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReorderQueueItemsRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new ReorderQueueItemsCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:remove-queue-item')
  async handleRemoveQueueItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RemoveQueueItemRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new RemoveQueueItemCommand(context.userId, context.sessionId, data),
    );
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:move-queue-item')
  async handleMoveQueueItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MoveQueueItemRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (context) => new MoveQueueItemCommand(context.userId, context.sessionId, data),
    );
  }

  private normalizeDeviceIcon(input: unknown): DeviceIcon {
    const valid: DeviceIcon[] = [
      'desktop',
      'mobile',
      'tablet',
      'speaker',
      'tv',
      'game-console',
      'other',
    ];
    if (typeof input === 'string' && valid.includes(input as DeviceIcon)) {
      return input as DeviceIcon;
    }
    return 'desktop';
  }

  private async authenticate(socket: Socket): Promise<PlaybackSocketContext> {
    const user = socket.data.user;
    if (
      !user ||
      !user.sessionId ||
      !user.user.id ||
      !socket.data.playbackDeviceId ||
      !socket.data.playbackDeviceName ||
      !socket.data.playbackDeviceIcon
    ) {
      throw new WsException('Unauthorized: Invalid token');
    }
    return {
      userId: user.user.id,
      sessionId: user.sessionId,
      playbackDeviceId: socket.data.playbackDeviceId,
      playbackDeviceName: socket.data.playbackDeviceName,
      playbackDeviceIcon: socket.data.playbackDeviceIcon,
    };
  }

  private async runPlaybackMutation(
    client: Socket,
    createCommand: (context: PlaybackSocketContext) => unknown,
    broadcastMode: 'full' | 'currentTime' = 'full',
  ): Promise<PlaybackState> {
    const context = await this.authenticate(client);
    await this.playbackDeviceRegistry.registerOrUpdateDevice(context.userId, {
      deviceId: context.playbackDeviceId,
      deviceName: context.playbackDeviceName,
      deviceIcon: context.playbackDeviceIcon,
    });
    const result = (await this.commandBus.execute(
      createCommand(context) as Command<PlaybackState>,
    )) as PlaybackState;

    const room = `user:${context.userId}`;
    if (broadcastMode === 'currentTime') {
      client.to(room).emit('event:current-time-updated', {
        currentTime: result.currentTime,
        version: result.version,
      });
    } else {
      client.to(room).emit('event:playback-state-updated', result);
    }
    return result;
  }
}
