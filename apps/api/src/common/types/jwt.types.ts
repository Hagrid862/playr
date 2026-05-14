export interface JwtPayload {
  sub: string;
  username: string;
  sessionId: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;
  nbf?: number;
}
