import {
	ResendEmailVerificationCodeRequest, ResendEmailVerificationCodeResponse, ResendEmailVerificationCodeResponseSchema,
} from "@repo/contracts";
import {apiClient} from "@/lib/api-client";

export const resendEmailVerificationCode = (data: ResendEmailVerificationCodeRequest) => {
	return apiClient<ResendEmailVerificationCodeResponse>('auth/resend-email-verification-code', {
		method: "POST",
		body: data,
		zodSchema: ResendEmailVerificationCodeResponseSchema,
		allowRefresh: false,
	});
};