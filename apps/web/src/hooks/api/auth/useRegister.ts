import { useMutation } from '@tanstack/react-query';
import { register } from './requests/register';
import type { RegisterRequest, RegisterResponse } from '@repo/contracts';

export const useRegister = () => {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: register,
  });
};
