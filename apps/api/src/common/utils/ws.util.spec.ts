import { describe, expect, it } from 'vitest';
import { extractAccessTokenFromSocket } from './ws.util';

describe('ws.util', () => {
  describe('extractAccessTokenFromSocket', () => {
    it('should extract token from handshake.auth.token', () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'auth-token' },
        },
      } as any;

      const result = extractAccessTokenFromSocket(mockSocket);

      expect(result).toBe('auth-token');
    });

    it('should extract token from handshake.headers.authorization', () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {
            authorization: 'Bearer header-token',
          },
        },
      } as any;

      const result = extractAccessTokenFromSocket(mockSocket);

      expect(result).toBe('header-token');
    });

    it('should return undefined if no token is found', () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {},
        },
      } as any;

      const result = extractAccessTokenFromSocket(mockSocket);

      expect(result).toBeUndefined();
    });

    it('should return undefined if authorization header does not start with Bearer', () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {
            authorization: 'Basic credentials',
          },
        },
      } as any;

      const result = extractAccessTokenFromSocket(mockSocket);

      expect(result).toBeUndefined();
    });
  });
});
