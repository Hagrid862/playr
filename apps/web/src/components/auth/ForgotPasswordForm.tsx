import { SyntheticEvent } from 'react';
import type { FormData } from '@/hooks/forms/useForgotPasswordForm';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ArrowsClockwiseIcon, CircleNotchIcon } from '@phosphor-icons/react';

interface ForgotPasswordFormProps {
	formData: FormData;
	isValid: boolean;
	isLoading: boolean;
	resendTimer?: number;
	onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
	onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
	onBlur: (field: keyof FormData) => void;
	getFieldError: (field: keyof FormData) => string | undefined;
}

export function ForgotPasswordForm({
	formData,
	isValid,
	isLoading,
	resendTimer = 0,
	onSubmit,
	onChange,
	onBlur,
	getFieldError,
}: ForgotPasswordFormProps) {
	const emailError = getFieldError('email');
	const isTimerActive = resendTimer > 0;

	return (
		<form onSubmit={onSubmit}>
			<Field data-invalid={!!emailError} className="grid gap-2">
				<FieldLabel htmlFor="email">Email</FieldLabel>
				<Input
					id="email"
					type="email"
					placeholder="Enter your email address"
					value={formData.email}
					onChange={(e) => onChange('email', e.target.value)}
					onBlur={() => onBlur('email')}
					disabled={isLoading}
					required
				/>
				{emailError && <FieldError>{emailError}</FieldError>}
			</Field>
			<Button
				type="submit"
				className="w-full mt-4"
				disabled={!isValid || isLoading || isTimerActive}
			>
				{isLoading ? (
					<>
						<CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
						Sending...
					</>
				) : isTimerActive ? (
					<>
						<ArrowsClockwiseIcon className="mr-2 h-4 w-4" />
						Wait {resendTimer}s to send
					</>
				) : (
					<>
						<ArrowsClockwiseIcon className="mr-2 h-4 w-4" />
						Send Reset Code
					</>
				)}
			</Button>
		</form>
	);
}
