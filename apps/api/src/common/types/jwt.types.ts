export interface JwtPayload {
  sub: string;
  username: string;
  sessionId: string;
  iat: number;
  exp: number;
}
