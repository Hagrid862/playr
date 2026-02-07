import { User } from '@repo/db';

export class LoginCommand {
  constructor(public readonly user: User) {}
}
