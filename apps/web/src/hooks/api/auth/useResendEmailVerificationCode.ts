import { useMutation } from '@tanstack/react-query';
import type {
  ResendEmailVerificationCodeRequest,
  ResendEmailVerificationCodeResponse,
} from '@repo/contracts';
import { resendEmailVerificationCode } from '@/hooks/api/auth/requests/resendEmailVerificationCode';

export const useResendEmailVerificationCode = () => {
  return useMutation<
    ResendEmailVerificationCodeResponse,
    Error,
    ResendEmailVerificationCodeRequest
  >({
    mutationFn: resendEmailVerificationCode,
  });
};
