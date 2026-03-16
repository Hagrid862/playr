import type { User } from "@repo/db";
import { Gender } from "@repo/db";
import { TEST_IDS } from "./constants";

export function userBuilder(overrides?: Partial<User>): User {
  const now = new Date();
  return {
    id: TEST_IDS.user,
    username: "testuser",
    password: "hashed-password",
    firstName: "John",
    lastName: "Doe",
    birthDate: "2000-01-01",
    gender: Gender.male,
    createdAt: now,
    updatedAt: now,
    avatarId: TEST_IDS.image,
    description: null,
    deletedAt: null,
    ...overrides,
  };
}
