import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getCorsOrigin } from '../../common/config/cors-config';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  namespace: 'playback',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
export class PlaybackGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    if (!client.user) {
      client.disconnect(true);
      return;
    }
    await client.join(`user:${client.user.user.id}`);
  }

  @SubscribeMessage('command:play')
  handlePlay(@ConnectedSocket() client: Socket) {
    if (!client.user) {
      throw new WsException('Unauthorized: Invalid token');
    }

    return { ok: true, userId: client.data.user.user.id };
  }
}
