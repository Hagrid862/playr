import type { LoginRequest } from "@repo/contracts";

export function loginRequestBuilder(
  overrides?: Partial<LoginRequest>,
): LoginRequest {
  return {
    email: "test@example.com",
    password: "Password1",
    ...overrides,
  };
}
