import { PlaybackWsExceptionFilter } from '@/common/filters/ws-exception.filter';
import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { Logger, UnauthorizedException, UseFilters, UseGuards } from '@nestjs/common';
import { Command, CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
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
import { SetPlaybackStateResponseDto } from './dto/response/set-playback-state.response.dto';
import { GetPlaybackStateQuery } from './queries/impl/get-playback-state.query';
import { GetQueueStateQuery } from './queries/impl/get-queue-state.query';

@UseFilters(PlaybackWsExceptionFilter)
@WebSocketGateway({
  namespace: 'playback',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
export class PlaybackGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PlaybackGateway.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = extractAccessTokenFromSocket(socket);
        if (!token) {
          return next(new Error('Unauthorized: No token provided'));
        }
        socket.data.user = await this.tokenService.authenticateWithAccessToken(token);
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
    if (!client.data.user) {
      client.disconnect(true);
      return;
    }
    await client.join(`user:${client.data.user.user.id}`);
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
  @SubscribeMessage('command:set-state')
  async handleSetPlayback(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetPlaybackStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    return this.runPlaybackMutation(
      client,
      (userId, sessionId) => new SetPlaybackStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetCurrentTimeStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetFavoriteStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetLibraryStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetPlayingStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetRepeatStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetTrackStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetShuffleStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetVolumeLevelStateCommand(userId, sessionId, data),
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
      (userId, sessionId) => new AddQueueItemCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetNextQueueItemCommand(userId, sessionId, data),
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
      (userId, sessionId) => new SetQueueCommand(userId, sessionId, data),
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
      (userId, sessionId) => new ClearQueueCommand(userId, sessionId, data),
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
      (userId, sessionId) => new ShuffleQueueCommand(userId, sessionId, data),
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
      (userId, sessionId) => new ReorderQueueItemsCommand(userId, sessionId, data),
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
      (userId, sessionId) => new RemoveQueueItemCommand(userId, sessionId, data),
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
      (userId, sessionId) => new MoveQueueItemCommand(userId, sessionId, data),
    );
  }

  private async authenticate(socket: Socket): Promise<{ userId: string; sessionId: string }> {
    const user = socket.data.user;
    if (!user || !user.sessionId || !user.user.id) {
      throw new WsException('Unauthorized: Invalid token');
    }
    return { userId: user.user.id, sessionId: user.sessionId };
  }

  private async runPlaybackMutation(
    client: Socket,
    createCommand: (userId: string, sessionId: string) => unknown,
  ): Promise<PlaybackState> {
    const { userId, sessionId } = await this.authenticate(client);
    const result = (await this.commandBus.execute(
      createCommand(userId, sessionId) as Command<PlaybackState>,
    )) as PlaybackState;
    client.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }
}
