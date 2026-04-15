import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { SyntheticEvent, useEffect, useMemo } from 'react';
import { useResendEmailVerificationCode, useVerifyEmail } from '@/hooks/api/auth';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useVerifyEmailForm } from '@/hooks/forms/useVerifyEmailForm.ts';

const verifyEmailSearchSchema = z.object({
  isVerificationEmailSent: z
    .boolean()
    .optional()
    .default(false),
});

export const Route = createFileRoute('/auth/verify-email')({
  component: RouteComponent,

  validateSearch: (search) => verifyEmailSearchSchema.parse(search),

  beforeLoad: ({ context }) => {
    const { user, isAuthenticated, _hasHydrated } = context.auth;

    if (!user && _hasHydrated) {
      throw redirect({ to: '/auth/login' });
    }

    if (isAuthenticated) {
      throw redirect({ to: '/app' });
    }

    if (_hasHydrated) {
      const hasPrimaryEmail = user?.emailAddresses?.some((e) => e.type === 'primary');
      if (!hasPrimaryEmail) {
        console.error('internal application error: user has no primary email address');
      }
    }
  },
});

export function RouteComponent() {
  const { isVerificationEmailSent } = Route.useSearch();
  const navigate = useNavigate();
  const {
    mutateAsync: resendEmailVerificationCode,
    isPending: resendEmailVerificationCodeIsLoading,
  } = useResendEmailVerificationCode();
  const {
    mutateAsync: verifyEmail,
  } = useVerifyEmail();
  const {
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
  } = useVerifyEmailForm();

  const user = useAuthStore((state) => state.user);

  const primaryEmail = useMemo(() => {
    return user?.emailAddresses?.find((e) => e.type === 'primary')?.email;
  }, [user]);

  //puts email into the form data when the store hydrates, so the user doesn't have to pointlessly enter email
  useEffect(() => {
    if(primaryEmail) {
      handleChange('email', primaryEmail);
    }
  }, [primaryEmail, handleChange]);

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
    if (!primaryEmail) {
      console.error(
        'No primary email found for the user while trying to resend email verification code.',
      );
      return;
    }

    try{
      await resendEmailVerificationCode({ email: primaryEmail });
    } catch (err) {
      console.error('Failed to resend email verification code', err);
    }
  };

  // Placeholder component only to test logic and flow will be replaced with actual UI later.
  return (
    <div>
      {/* TODO make an actual page and a component and put it here.*/}
      <p>Send verification email: {isVerificationEmailSent ? 'Yes' : 'No'}</p>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          onChange={(e) => handleChange('otpCode', e.target.value)}
          onBlur={() => handleBlur('otpCode')}
          placeholder="Enter OTP"
        />
        <br></br>
        {getFieldError('otpCode') && <span className="text-destructive">{getFieldError('otpCode')}</span>}
        <input type="submit" value="verify email" />
      </form>

      {primaryEmail ? (
        <p>Primary email: {primaryEmail} </p>
      ) : (
        <p className="text-destructive">No primary email address found</p>
      )}

      <button
        onClick={onResendEmail}
        disabled={!primaryEmail || resendEmailVerificationCodeIsLoading}
      >
        {resendEmailVerificationCodeIsLoading ? 'Resending...' : 'Resend email verification code'}
      </button>
    </div>
  );
}
