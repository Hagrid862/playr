import { User } from "@repo/db";

export interface AuthenticatedUser {
  user: User;
  sessionId?: string;
}