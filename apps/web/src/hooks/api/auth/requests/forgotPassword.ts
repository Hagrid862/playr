import type { ForgotPasswordRequest, ForgotPasswordResponse } from '@repo/contracts';
import {apiClient} from "@/lib/api-client.ts";
import { ForgotPasswordResponseSchema } from '@repo/contracts';

export const forgotPassword = (data: ForgotPasswordRequest) => {
	return apiClient<ForgotPasswordResponse>('auth/forget-password', {
		method: 'POST',
		body: data,
		zodSchema: ForgotPasswordResponseSchema
	});
};