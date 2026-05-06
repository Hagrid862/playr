import type { ForgotPasswordRequest, ForgotPasswordResponse } from '@repo/contracts';
import {useMutation} from "@tanstack/react-query";
import {forgotPassword} from "./requests/forgotPassword.ts";

export const useForgotPassword = () => {
  return useMutation<ForgotPasswordResponse, Error, ForgotPasswordRequest>({
    mutationFn: forgotPassword,
  });
};