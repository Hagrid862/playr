import { Socket } from 'socket.io';

/**
 * Reads the access JWT from the Socket.IO handshake
 */
export function extractAccessTokenFromSocket(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) return authToken;

  // we do not accept token as query params since that can lead to leaking the token in the URL
  // if you need to pass the token in the URL, you can use the Authorization header or handshake.auth instead

  const authHeader = client.handshake.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return undefined;
}
