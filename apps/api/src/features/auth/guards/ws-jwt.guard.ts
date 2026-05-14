import { extractAccessTokenFromSocket } from '@/common/utils/ws.util';
import { TokenService } from '@/features/auth/services/token.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new WsException(`Unauthorized: ${error.message}`);
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`WsJwtGuard: unexpected error — ${err.message}`, err.stack);
      throw new WsException('Internal server error');
    }
  }
}
