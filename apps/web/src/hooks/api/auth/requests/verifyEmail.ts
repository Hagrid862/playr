import type { VerifyEmailRequest, VerifyEmailResponse } from "@repo/contracts";
import { VerifyEmailResponseSchema } from "@repo/contracts";
import { apiClient } from "@/lib/api-client";

export const verifyEmail = (data: VerifyEmailRequest) => {
	return apiClient<VerifyEmailResponse>('auth/verify-email', {
		method: 'POST',
		body: data,
		zodSchema: VerifyEmailResponseSchema,
		allowRefresh: false,
	});
};