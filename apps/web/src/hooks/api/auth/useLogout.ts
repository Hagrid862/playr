import { useMutation } from '@tanstack/react-query';
import { LogoutRequest, LogoutResponse } from '@repo/contracts';
import { logout } from '@/hooks/api/auth/requests/logout';

export const useLogout = () => {
  return useMutation<LogoutResponse, Error, LogoutRequest>({
    mutationFn: logout,
  });
};
