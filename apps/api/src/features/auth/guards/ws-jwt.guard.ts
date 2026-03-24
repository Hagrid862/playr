import { TokenService } from '@/features/auth/services/token.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    // 1. Create a "fake" request object that Passport can understand
    // We extract the token from wherever the socket provides it
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      client.user = await this.tokenService.authenticateWithAccessToken(token);
      return true;
    } catch {
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Check Socket.io 'auth' object (Best practice)
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;

    // Check query params (Matches your JwtStrategy's extractTokenFromQuery)
    if (typeof client.handshake.query?.token === 'string') return client.handshake.query.token;

    // Check headers
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7);

    return undefined;
  }
}
