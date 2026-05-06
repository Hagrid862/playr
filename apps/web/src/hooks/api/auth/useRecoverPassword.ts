import type { RecoverPasswordResponse, RecoverPasswordRequest } from '@repo/contracts';
import {useMutation} from "@tanstack/react-query";
import {recoverPassword} from "@/hooks/api/auth/requests/recoverPassword.ts";

export const useRecoverPassword = () => {
	return useMutation<RecoverPasswordResponse, Error, RecoverPasswordRequest>({
		mutationFn: recoverPassword,
	});
};