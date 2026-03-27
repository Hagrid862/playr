import { PlaybackWsExceptionFilter } from '@/common/filters/ws-exception.filter';
import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { UseFilters, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { SetCurrentTimeStateCommand } from './commands/impl/set-current-time-state.command';
import { SetFavoriteStateCommand } from './commands/impl/set-favorite-state.command';
import { SetLibraryStateCommand } from './commands/impl/set-library-state.command';
import { SetPlaybackStateCommand } from './commands/impl/set-playback-state.command';
import { SetPlayingStateCommand } from './commands/impl/set-playing-state.command';
import { SetRepeatStateCommand } from './commands/impl/set-repeat-state.command';
import { SetShuffleStateCommand } from './commands/impl/set-shuffle-state.command';
import { SetTrackStateCommand } from './commands/impl/set-track-state.command';
import { SetVolumeLevelStateCommand } from './commands/impl/set-volume-level-state.command';
import { SetCurrentTimeStateRequestDto } from './dto/request/set-current-time-state.request.dto';
import { SetFavoriteStateRequestDto } from './dto/request/set-favorite-state.request.dto';
import { SetLibraryStateRequestDto } from './dto/request/set-library-state.request.dto';
import { SetPlaybackStateRequestDto } from './dto/request/set-playback-state.request.dto';
import { SetPlayingStateRequestDto } from './dto/request/set-playing-state.request.dto';
import { SetRepeatStateRequestDto } from './dto/request/set-repeat-state.request.dto';
import { SetShuffleStateRequestDto } from './dto/request/set-shuffle-state.request.dto';
import { SetTrackStateRequestDto } from './dto/request/set-track-state.request.dto';
import { SetVolumeLevelStateRequestDto } from './dto/request/set-volume-level-state.request.dto';
import { GetPlaybackStateResponseDto } from './dto/response/get-playback-state.response.dto';
import { SetPlaybackStateResponseDto } from './dto/response/set-playback-state.response.dto';
import { GetPlaybackStateQuery } from './queries/impl/get-playback-state.query';

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
      } catch {
        next(new Error('Unauthorized: Invalid token'));
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
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;

    const result = await this.queryBus.execute(new GetPlaybackStateQuery(userId));
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-state')
  async handleSetPlayback(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetPlaybackStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetPlaybackStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-current-time-state')
  async handleSetCurrentTimeState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetCurrentTimeStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetCurrentTimeStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-favorite-state')
  async handleSetFavoriteState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetFavoriteStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetFavoriteStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-library-state')
  async handleSetLibraryState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetLibraryStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetLibraryStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-playing-state')
  async handleSetPlayingState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetPlayingStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetPlayingStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-repeat-state')
  async handleSetRepeatState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetRepeatStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetRepeatStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-track-state')
  async handleSetTrackState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetTrackStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetTrackStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-shuffle-state')
  async handleSetShuffleState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetShuffleStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetShuffleStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('command:set-volume-level-state')
  async handleSetVolumeLevelState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SetVolumeLevelStateRequestDto,
  ): Promise<SetPlaybackStateResponseDto> {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    const result: PlaybackState = await this.commandBus.execute(
      new SetVolumeLevelStateCommand(userId, sessionId, data),
    );

    this.server.to(`user:${userId}`).emit('event:playback-state-updated', result);
    return result;
  }
}
