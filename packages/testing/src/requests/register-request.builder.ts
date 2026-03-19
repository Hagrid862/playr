import type { RegisterRequest } from "@repo/contracts";
import { Gender } from "@repo/db";

export function registerRequestBuilder(
  overrides?: Partial<RegisterRequest>,
): RegisterRequest {
  return {
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    birthDate: "2000-01-01",
    gender: Gender.male,
    email: "test@example.com",
    password: "Password1",
    ...overrides,
  };
}
