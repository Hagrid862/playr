import { User } from '@repo/db';

export type AuthenticatedPrincipal = Omit<User, 'password'>;

export interface AuthenticatedUser {
  user: AuthenticatedPrincipal;
  sessionId?: string;
}
