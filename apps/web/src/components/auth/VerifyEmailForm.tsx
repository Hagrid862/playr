import {SyntheticEvent} from "react";
import type {FormData} from "@/hooks/forms/useVerifyEmailForm";
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
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
	resendTimer: number;
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
	resendTimer = 0,
}: VerifyEmailFormProps) {
	const otpError = getFieldError('otpCode');

	return (
		<Card className="mx-auto max-w-md">
			<form onSubmit={onSubmit}>
				<CardHeader>
					<CardTitle className="text-2xl">Verify your Email</CardTitle>
					<CardDescription className="py-3">
						Enter the verification code we sent to your email address:{" "}
						<span className="font-medium text-foreground">{formData.email}</span>.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-6">
					<Field data-invalid={!!otpError} className="grid gap-2">
						<FieldLabel htmlFor="otp-verification" className="text-center">Verification Code</FieldLabel>
						<div className="flex justify-center">
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
								<InputOTPGroup className="gap-1 *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-10 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
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
						</div>
						{otpError && <FieldError className="text-center">{otpError}</FieldError>}
					</Field>
					<div className="flex justify-center mt-2">
						<Button
							variant="outline"
							size="sm"
							type="button"
							onClick={onResend}
							disabled={isResendLoading || isVerifyEmailLoading || resendTimer > 0}
							className="text-muted-foreground hover:text-primary"
						>
							{isResendLoading ? (
								<CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<ArrowsClockwiseIcon className="mr-2 h-4 w-4" />
							)}
							{resendTimer > 0 ? `Wait ${resendTimer}s to Resend code` : "Resend Code"}
						</Button>
					</div>
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
				</CardContent>
			</form>
		</Card>
	);
}