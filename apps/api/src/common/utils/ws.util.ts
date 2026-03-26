import { Socket } from 'socket.io';

/**
 * Reads the access JWT from the Socket.IO handshake
 */
export function extractAccessTokenFromSocket(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) return authToken;

  const queryToken = client.handshake.query?.token;
  if (typeof queryToken === 'string' && queryToken) return queryToken;
  if (Array.isArray(queryToken) && queryToken.length > 0 && queryToken[0]) return queryToken[0];

  const authHeader = client.handshake.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return undefined;
}
