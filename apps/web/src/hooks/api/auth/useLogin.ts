import { useMutation } from '@tanstack/react-query';
import { login } from './requests/login';
import type { LoginRequest, LoginResponse } from '@repo/contracts';

export const useLogin = () => {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: login,
  });
};
