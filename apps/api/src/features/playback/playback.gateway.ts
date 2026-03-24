import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  namespace: 'playback',
  cors: {
    origin: '*', // TODO: restrict origin
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
    return { ok: true, userId: client.user!.user.id };
  }
}
