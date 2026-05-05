import { useMutation } from '@tanstack/react-query';
import type { VerifyEmailRequest, VerifyEmailResponse } from '@repo/contracts';
import { verifyEmail } from '@/hooks/api/auth/requests/verifyEmail';

export const useVerifyEmail = () => {
  return useMutation<VerifyEmailResponse, Error, VerifyEmailRequest>({
    mutationFn: verifyEmail,
  });
};
