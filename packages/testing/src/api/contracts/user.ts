import type { ZodUser } from '@repo/contracts';
import { buildWithOverrides } from '../../shared';
import { now } from '../internal/time';

export function buildZodUser(overrides: Partial<ZodUser> = {}): ZodUser {
  const base: ZodUser = {
    id: 'user-id-123',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: 'male',
    description: null,
    avatarId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
