import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SyntheticEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useResendTimer } from '@/hooks/use-resend-timer';
import { useForgotPassword, useRecoverPassword } from '@/hooks/api/auth';
import { useForgotPasswordForm } from '@/hooks/forms/useForgotPasswordForm.ts';
import { useRecoverPasswordForm } from '@/hooks/forms/useRecoverPasswordForm.ts';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm.tsx';
import { RecoverPasswordForm } from '@/components/auth/RecoverPasswordForm.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeftIcon } from '@phosphor-icons/react';

export const Route = createFileRoute('/auth/forgot-password')({
	component: RouteComponent,
});

const RESEND_COOLDOWN_KEY = 'verify-email-resend-available-at';
const RESEND_COOLDOWN_SECONDS = 60;

export function RouteComponent() {
	const [showRecoverCard, setShowRecoverCard] = useState(false);
	const navigate = useNavigate();
	const { timeLeft: resendTimer, startTimer: startResendTimer } = useResendTimer(
		RESEND_COOLDOWN_KEY,
		RESEND_COOLDOWN_SECONDS,
	);

	const { mutateAsync: forgotPassword, isPending: forgotPasswordIsLoading } = useForgotPassword();
	const { mutateAsync: recoverPassword, isPending: recoverPasswordIsLoading } = useRecoverPassword();

	const {
		formData: forgotPasswordFormData,
		isFormValid: forgotPasswordIsFormValid,
		setTouched: forgotPasswordSetTouched,
		handleChange: forgotPasswordHandleChange,
		handleBlur: forgotPasswordHandleBlur,
		handleSubmit: forgotPasswordHandleSubmit,
		getFieldError: forgotPasswordGetFieldError,
	} = useForgotPasswordForm();

	const {
		formData: recoverPasswordFormData,
		isFormValid: recoverPasswordIsFormValid,
		isPasswordFocused,
		setIsPasswordFocused,
		setTouched: recoverPasswordSetTouched,
		handleChange: recoverPasswordHandleChange,
		handleBlur: recoverPasswordHandleBlur,
		handleSubmit: recoverPasswordHandleSubmit,
		getFieldError: recoverPasswordGetFieldError,
	} = useRecoverPasswordForm();

	const onForgotPasswordSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const data = forgotPasswordHandleSubmit();
		if (!data) return;

		try {
			const result = await forgotPassword(data);
			if (result.success) {
				setShowRecoverCard(true);

				recoverPasswordHandleChange('email', forgotPasswordFormData.email)
			}
		} catch (err) {
			console.error('Failed to send forgot password email', err);
		}
	};

	const onRecoverPasswordSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const data = recoverPasswordHandleSubmit();
		if (!data) return;

		try {
			const result = await recoverPassword(data);
			if (result.success) {
				await navigate({ to: '/auth/login' });
			}
		} catch (err) {
			console.error('Failed to recover password', err);
		}
	};

	const onResendCode = async () => {
		if (resendTimer > 0) return;
		try {
			await forgotPassword({ email: forgotPasswordFormData.email });
			startResendTimer();
		} catch (err) {
			console.error('Failed to resend code', err);
		}
	};

	const onGoBack = () => {
		startResendTimer();
		setShowRecoverCard(false);

		// Reset first form with email
		forgotPasswordHandleChange('email', '');
		forgotPasswordSetTouched({ email: false });

		// Reset second form with otp code and new password
		recoverPasswordHandleChange('otpCode', '');
		recoverPasswordHandleChange('email', "");
		recoverPasswordHandleChange('newPassword', '');
		recoverPasswordHandleChange('confirmPassword', '');
		recoverPasswordSetTouched({ otpCode: false, newPassword: false, email: false, confirmPassword: false });
	};

	return (
		<div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
			{!showRecoverCard ? (
				<Card className="w-1/6 min-w-sm">
					<CardHeader className="w-full">
						<CardTitle className="text-2xl w-full whitespace-nowrap">Recover your password</CardTitle>
						<CardDescription className="py-2 w-full">
							Enter your email to which we will sent code to reset your password.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<ForgotPasswordForm
							formData={forgotPasswordFormData}
							isValid={forgotPasswordIsFormValid}
							resendTimer={resendTimer}
							isLoading={forgotPasswordIsLoading}
							onSubmit={onForgotPasswordSubmit}
							onChange={forgotPasswordHandleChange}
							onBlur={forgotPasswordHandleBlur}
							getFieldError={forgotPasswordGetFieldError}
						/>
						<Button
							variant="outline"
							size="sm"
							className="w-full justify-center! gap-2"
							onClick={() => window.history.back()}
						>
							<ArrowLeftIcon size={20} />
							Cancel
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card className="w-1/5 min-w-sm">
					<CardHeader className="w-full">
						<CardTitle className="text-2xl w-full whitespace-nowrap">Reset your password</CardTitle>
						<CardDescription className="py-2 w-full">
							Enter the code sent to your email and your new password.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<RecoverPasswordForm
							formData={recoverPasswordFormData}
							isValid={recoverPasswordIsFormValid}
							isLoading={recoverPasswordIsLoading}
							onSubmit={onRecoverPasswordSubmit}
							onChange={recoverPasswordHandleChange}
							onBlur={recoverPasswordHandleBlur}
							getFieldError={recoverPasswordGetFieldError}
							onResend={onResendCode}
							isResendLoading={forgotPasswordIsLoading}
							resendTimer={resendTimer}
							isPasswordFocused={isPasswordFocused}
							setIsPasswordFocused={setIsPasswordFocused}
						/>
						<Button
							variant="outline"
							size="sm"
							className="w-full justify-center! gap-2"
							onClick={() => onGoBack()}
						>
							<ArrowLeftIcon size={20} />
							Go back
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
