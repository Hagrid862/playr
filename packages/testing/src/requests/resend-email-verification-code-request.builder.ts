import type { ResendEmailVerificationCodeRequest } from "@repo/contracts";

export function resendEmailVerificationCodeRequestBuilder(
  overrides?: Partial<ResendEmailVerificationCodeRequest>,
): ResendEmailVerificationCodeRequest {
  return {
    email: "test@example.com",
    ...overrides,
  };
}
