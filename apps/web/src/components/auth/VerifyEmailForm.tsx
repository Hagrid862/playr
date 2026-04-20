import {SyntheticEvent} from "react";
import type {FormData} from "@/hooks/forms/useVerifyEmailForm";
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription, CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Field, FieldError, FieldLabel,
} from "@/components/ui/field"
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp"
import {ArrowsClockwiseIcon, CircleNotchIcon} from "@phosphor-icons/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

interface VerifyEmailFormProps {
	formData: FormData;
	isValid: boolean;
	isVerifyEmailLoading: boolean;
	onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
	onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
	onBlur: (field: keyof FormData) => void;
	getFieldError: (field: keyof FormData) => string | undefined;
	onResend: () => void;
	isResendLoading: boolean;
}

export function VerifyEmailForm({
	formData,
	isValid,
	isVerifyEmailLoading,
	onSubmit,
	onChange,
	onBlur,
	getFieldError,
	onResend,
	isResendLoading,
}: VerifyEmailFormProps) {
	const otpError = getFieldError('otpCode');

	return (
		<Card className="mx-auto max-w-md">
			<form onSubmit={onSubmit}>
				<CardHeader>
					<CardTitle>Verify your Email</CardTitle>
					<CardDescription>
						Enter the verification code we sent to your email address:
						<span className="font-medium">{formData.email}</span>.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Field data-invalid={!!otpError}>
						<FieldLabel htmlFor="otp-verification">Verification Code</FieldLabel>
						<InputOTP
							maxLength={8}
							id="otp-verification"
							required
							inputMode="numeric"
							pattern={REGEXP_ONLY_DIGITS}
							value={formData.otpCode}
							onChange={(value) => onChange('otpCode', value) }
							onBlur={() => onBlur('otpCode') }
							disabled={isVerifyEmailLoading}
						>
							<InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
								<InputOTPSlot index={6} />
								<InputOTPSlot index={7} />
							</InputOTPGroup>
						</InputOTP>
						{otpError && <FieldError>{otpError}</FieldError>}
						<div className="flex justify-start">
							<Button
								variant="outline"
								size="xs"
								type="button"
								onClick={onResend}
								disabled={isResendLoading || isVerifyEmailLoading || !!getFieldError('email')}
							>
								{isResendLoading ? (
									<CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<ArrowsClockwiseIcon className="mr-2 h-4 w-4" size={16}/>
								)}
								Resend Code
							</Button>
						</div>
					</Field>
				</CardContent>
				<CardFooter>
					<Field>
						<Button
							type="submit"
							className="w-full"
							disabled={!isValid || isVerifyEmailLoading}
						>
							{isVerifyEmailLoading ? (
								<CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
							) : (
								"Verify"
							)}
						</Button>
					</Field>
				</CardFooter>
			</form>
		</Card>
	);
}