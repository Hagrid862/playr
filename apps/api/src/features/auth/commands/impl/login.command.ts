import { AuthenticatedPrincipal } from '@/common/types/auth.types';

export class LoginCommand {
  constructor(public readonly user: AuthenticatedPrincipal) {}
}
