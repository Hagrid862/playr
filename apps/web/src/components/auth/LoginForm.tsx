import { TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import type { FormData } from '@/hooks/forms/useLoginForm';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { SyntheticEvent } from 'react';

interface LoginFormProps {
  id?: string;
  formData: FormData;
  isLoading: boolean;
  isValid: boolean;
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onBlur: (field: keyof FormData) => void;
  getFieldError: (field: keyof FormData) => string | undefined;
}

export function LoginForm({
  id,
  formData,
  isLoading,
  isValid,
  onSubmit,
  onChange,
  onBlur,
  getFieldError,
}: LoginFormProps) {
  return (
    <form id={id} className="flex flex-col gap-4" onSubmit={onSubmit}>
      <TextField
        label="Email"
        type="email"
        placeholder="john@example.com"
        value={formData.email}
        error={getFieldError('email')}
        onChange={(value) => onChange('email', value)}
        onBlur={() => onBlur('email')}
      />

      <div className="flex flex-col gap-2">
        <TextField
          label="Password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          error={getFieldError('password')}
          onChange={(value) => onChange('password', value)}
          onBlur={() => onBlur('password')}
        />
        <Button
          type="button"
          variant="link"
          color="primary"
          className="self-end px-0 text-sm h-auto font-normal"
        >
          Forgot password?
        </Button>
      </div>

      <Button
        type="submit"
        color="primary"
        className="w-full mt-2"
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <>
            <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          'Login'
        )}
      </Button>
    </form>
  );
}
