import {useMutation} from "@tanstack/react-query";
import {ResendEmailVerificationCodeRequest, ResendEmailVerificationCodeResponse} from "@repo/contracts";
import {resendEmailVerificationCode} from "@/hooks/api/auth/requests/resendEmailVerificationCode.ts";

export const useResendEmailVerificationCode = () => {
	return useMutation<ResendEmailVerificationCodeResponse, Error, ResendEmailVerificationCodeRequest>({
		mutationFn: resendEmailVerificationCode,
	});
};