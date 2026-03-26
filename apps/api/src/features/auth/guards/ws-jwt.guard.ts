import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { TokenService } from '@/features/auth/services/token.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    const token = extractAccessTokenFromSocket(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      client.data.user = await this.tokenService.authenticateWithAccessToken(token);
      return true;
    } catch {
      throw new WsException('Unauthorized: Invalid token');
    }
  }
}
