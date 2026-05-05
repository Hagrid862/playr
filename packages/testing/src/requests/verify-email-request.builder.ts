import type { VerifyEmailRequest } from "@repo/contracts";

export function verifyEmailRequestBuilder(
  overrides?: Partial<VerifyEmailRequest>,
): VerifyEmailRequest {
  return {
    email: "test@example.com",
    otpCode: "12345678",
    ...overrides,
  };
}
