import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import {SyntheticEvent, useEffect, useState} from 'react';
import { useResendEmailVerificationCode, useVerifyEmail } from '@/hooks/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useVerifyEmailForm } from '@/hooks/forms/useVerifyEmailForm';
import {VerifyEmailForm} from "@/components/auth/VerifyEmailForm.tsx";
import { z } from 'zod';

export const Route = createFileRoute('/auth/verify-email')({
  component: RouteComponent,
  validateSearch: z.object({
    email: z.string(),
  }),

  beforeLoad: () => {
    const { user, isAuthenticated } = useAuthStore.getState();

    if (!user) {
      throw redirect({ to: '/auth/login' });
    }

    if (isAuthenticated) {
      throw redirect({ to: '/app' });
    }
  },
});

export function RouteComponent() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const {
    mutateAsync: resendEmailVerificationCode,
    isPending: resendEmailVerificationCodeIsLoading,
  } = useResendEmailVerificationCode();
  
  const {
    mutateAsync: verifyEmail,
    isPending: verifyEmailIsLoading,
  } = useVerifyEmail();
  
  const {
    formData,
    isFormValid,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
  } = useVerifyEmailForm(email);

  const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = handleSubmit();
    if (!data) return;

    try {
      const result = await verifyEmail(data);
      if (result.success){
        useAuthStore.getState().setAuth(result.data.user, result.data.accessToken);
        await navigate({ to: '/' });
      } else {
        console.error('Failed to verify email');
      }
    } catch (err) {
      console.error('Failed to verify email', err);
    }
  };

  const onResendEmail = async () => {
    if (resendTimer > 0) return;
    try{
      await resendEmailVerificationCode({ email: formData.email });
      setResendTimer(60);
    } catch (err) {
      console.error('Failed to resend email verification code', err);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <VerifyEmailForm
        formData={formData}
        isValid={isFormValid}
        isVerifyEmailLoading={verifyEmailIsLoading}
        onSubmit={onSubmit}
        onChange={handleChange}
        onBlur={handleBlur}
        getFieldError={getFieldError}
        onResend={onResendEmail}
        isResendLoading={resendEmailVerificationCodeIsLoading}
        resendTimer={resendTimer}
      />
    </div>
  );
}
