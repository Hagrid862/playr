import type { AuthenticatedUser } from '@/common/types/auth.types';

declare module 'socket.io' {
  interface Socket {
    user?: AuthenticatedUser;
  }
}
