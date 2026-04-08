import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { z } from "zod";
import { SyntheticEvent, useMemo } from 'react';
import { useResendEmailVerificationCode, useVerifyEmail } from '@/hooks/api/auth';
import { useAuthStore } from '@/stores/auth.store.ts';

const verifyEmailSearchSchema = z.object({
	isVerificationEmailSent: z
		.string()
		.optional()
		.transform((val) => val === 'true')
		.default(false),
})

export const Route = createFileRoute('/auth/verify-email')({
	component: RouteComponent,

	validateSearch: (search) => verifyEmailSearchSchema.parse(search),

	beforeLoad: ({ context }) => {
		const { user, isAuthenticated, _hasHydrated } = context.auth;

		if (!user && _hasHydrated) {
			throw redirect({ to: '/auth/login' })
		}

		if (isAuthenticated) {
			throw redirect({ to: '/app' })
		}
	}
});


export function RouteComponent() {
	const { isVerificationEmailSent } = Route.useSearch();
  const navigate = useNavigate();
  const {
    mutateAsync: verifyEmail,
    isPending: verifyEmailIsLoading,
    error: verifyEmailError
  } = useVerifyEmail();
  const {
    mutateAsync: resendEmailVerificationCode,
    isPending: resendEmailVerificationCodeIsLoading,
    error: resendEmailVerificationCodeError
  } = useResendEmailVerificationCode();

  const user = useAuthStore((state) => state.user);

  const primaryEmail = useMemo(() => {
    return user?.emailAddresses?.find(e => e.type === 'primary')?.email;
  }, [user]);

	const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

    if (!primaryEmail) {
      console.error('No primary email found for the user while trying to verify email.');
      return;
    }

    // TODO add here verify email from useVerifyEmail after useVerifyEmailForm is done

    await navigate({ to: '/' });
	};

	const onResendEmail = async () => {
    if (!primaryEmail) {
      console.error('No primary email found for the user while trying to resend email verification code.');
      return;
    }

    await resendEmailVerificationCode({ email: primaryEmail });
	};

// Placeholder component only to test logic and flow will be replaced with actual UI later.
	return (
    <div>
      {/* TODO make an actual page and a component and put it here.*/}
      <p>Send verification email: {isVerificationEmailSent ? 'Yes' : 'No'}</p>
      <form onSubmit={onSubmit}>
        <input type="submit" value="verify email" />
      </form>

      <p className="text-destructive">No primary email address found</p>

      <button
        onClick={onResendEmail}
        disabled={!primaryEmail || resendEmailVerificationCodeIsLoading}
      >
        {resendEmailVerificationCodeIsLoading ? 'Resending...' : 'Resend email verification code'}
      </button>
    </div>
  );
}