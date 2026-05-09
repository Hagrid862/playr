import { SyntheticEvent, useId } from 'react';
import type { FormData } from '@/hooks/forms/useRecoverPasswordForm';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowsClockwiseIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { PasswordStrengthPopover } from './PasswordStrengthPopover';

interface RecoverPasswordFormProps {
  formData: FormData;
  isValid: boolean;
  isLoading: boolean;
  isPasswordFocused: boolean;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onBlur: (field: keyof FormData) => void;
  getFieldError: (field: keyof FormData) => string | undefined;
  setIsPasswordFocused: (focused: boolean) => void;
  onResend?: () => void;
  isResendLoading?: boolean;
  resendTimer?: number;
}

export function RecoverPasswordForm({
  formData,
  isValid,
  isLoading,
  isPasswordFocused,
  onSubmit,
  onChange,
  onBlur,
  getFieldError,
  setIsPasswordFocused,
  onResend,
  isResendLoading = false,
  resendTimer = 0,
}: RecoverPasswordFormProps) {
  const passwordId = useId();
  const otpError = getFieldError('otpCode');
  const newPasswordError = getFieldError('newPassword');
  const confirmPasswordError = getFieldError('confirmPassword');

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {/* OTP Code - 8 digits */}
      <Field data-invalid={!!otpError} className="grid gap-2">
        <FieldLabel htmlFor="otp-code">Verification Code</FieldLabel>
        <div className="flex justify-center">
          <InputOTP
            maxLength={8}
            id="otp-code"
            required
            inputMode="numeric"
            pattern={REGEXP_ONLY_DIGITS}
            value={formData.otpCode}
            onChange={(value) => onChange('otpCode', value)}
            onBlur={() => onBlur('otpCode')}
            disabled={isLoading}
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

      {/* New Password with Strength Popover */}
      <Field data-invalid={!!newPasswordError}>
        <FieldLabel htmlFor={passwordId}>New Password</FieldLabel>
        <FieldContent>
          <PasswordStrengthPopover
            id={passwordId}
            password={formData.newPassword}
            isOpen={isPasswordFocused}
            value={formData.newPassword}
            onChange={(value) => onChange('newPassword', value)}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => {
              setIsPasswordFocused(false);
              onBlur('newPassword');
            }}
            hasError={!!newPasswordError}
          />
        </FieldContent>
        {newPasswordError && <FieldError>{newPasswordError}</FieldError>}
      </Field>

      {/* Confirm Password */}
      <Field data-invalid={!!confirmPasswordError} className="grid gap-2">
        <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) => onChange('confirmPassword', e.target.value)}
          onBlur={() => onBlur('confirmPassword')}
          disabled={isLoading}
          required
        />
        {confirmPasswordError && <FieldError>{confirmPasswordError}</FieldError>}
      </Field>

      {/* Resend Code Button */}
      {onResend && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onResend}
            disabled={isResendLoading || isLoading || resendTimer > 0}
            className="text-muted-foreground hover:text-primary"
          >
            {isResendLoading ? (
              <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowsClockwiseIcon className="mr-2 h-4 w-4" />
            )}
            {resendTimer > 0 ? `Wait ${resendTimer}s to resend` : 'Resend Code'}
          </Button>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
        {isLoading ? <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" /> : 'Reset Password'}
      </Button>
    </form>
  );
}
