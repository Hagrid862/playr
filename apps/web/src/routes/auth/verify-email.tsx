import {createFileRoute, redirect, useNavigate, useRouter} from '@tanstack/react-router';
import { SyntheticEvent } from 'react';
import { useResendEmailVerificationCode, useVerifyEmail } from '@/hooks/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useVerifyEmailForm } from '@/hooks/forms/useVerifyEmailForm';
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useResendTimer } from '@/hooks/use-resend-timer';
import {SignOutIcon} from "@phosphor-icons/react";
import {Button} from "@/components/ui/button.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

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

const RESEND_COOLDOWN_KEY = 'verify-email-resend-available-at';
const RESEND_COOLDOWN_SECONDS = 60;

export function RouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const { email } = Route.useSearch();
  const { logout } = useAuthStore();
  const { timeLeft: resendTimer, startTimer: startResendTimer } = useResendTimer(
    RESEND_COOLDOWN_KEY,
    RESEND_COOLDOWN_SECONDS
  );

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
      if (result.success) {
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

    try {
      await resendEmailVerificationCode({ email: formData.email });
      startResendTimer();
    } catch (err) {
      console.error('Failed to resend email verification code', err);
    }
  };

  const handleLogout = async () => {
    logout();
    await router.invalidate();
    await navigate({ to: '/auth/login' });
  };

  return (
    <div className="flex flex-col min-h-screen w-full items-center justify-center bg-background">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Verify your Email</CardTitle>
          <CardDescription className="py-2">
            Enter the verification code we sent to your email address:{' '}
            <span className="font-medium text-foreground">{formData.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
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
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={verifyEmailIsLoading}
            className="flex items-center justify-center gap-1 text-muted-foreground hover:text-primary mt-4"
            >
          <SignOutIcon />
          <span>Log out</span>
        </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Logging out will reset your email verification progress. You&apos;ll need to verify your email again when you sign back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <SignOutIcon />
              <span>Log out</span>
            </AlertDialogAction>
            <AlertDialogCancel
              variant="default"
              size="sm"
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
