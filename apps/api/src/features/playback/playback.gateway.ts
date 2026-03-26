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
import { Server, Socket } from 'socket.io';
import { getCorsOrigin } from '../../common/config/cors-config';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { TokenService } from '../auth/services/token.service';
import { SetPlaybackStateCommand } from './commands/impl/set-playback-state.command';
import { SetPlaybackStateRequestDto } from './dto/request/set-playback-state.request.dto';
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
  @SubscribeMessage('command:play')
  async handlePlay(@ConnectedSocket() client: Socket) {
    const auth = client.data.user;
    if (!auth) throw new WsException('Unauthorized: Invalid token');

    const userId = auth.user.id;
    const sessionId = auth.sessionId;

    return { ok: true, userId, sessionId };
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

    const result = await this.commandBus.execute(
      new SetPlaybackStateCommand(userId, sessionId, data),
    );
    console.log('result', result);
    return result;
  }
}
