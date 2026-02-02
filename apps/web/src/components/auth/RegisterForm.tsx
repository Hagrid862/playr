import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { TextField, DatePickerField, SelectField } from '@/components/form';
import { PasswordStrengthPopover } from './PasswordStrengthPopover';
import type { FormData } from '@/hooks/forms/useRegisterForm';

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

interface RegisterFormProps {
  formData: FormData;
  isPasswordFocused: boolean;
  showPasswordError: boolean;
  passwordError?: string;
  onSubmit: (e: React.FormEvent) => void;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onBlur: (field: keyof FormData) => void;
  getFieldError: (field: keyof FormData) => string | undefined;
  setIsPasswordFocused: (focused: boolean) => void;
}

export function RegisterForm({
  formData,
  isPasswordFocused,
  showPasswordError,
  passwordError,
  onSubmit,
  onChange,
  onBlur,
  getFieldError,
  setIsPasswordFocused,
}: RegisterFormProps) {
  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <TextField
        label="Username"
        placeholder="johndoe"
        value={formData.username}
        error={getFieldError('username')}
        onChange={(value) => onChange('username', value)}
        onBlur={() => onBlur('username')}
      />

      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="First name"
          placeholder="John"
          value={formData.firstName}
          error={getFieldError('firstName')}
          onChange={(value) => onChange('firstName', value)}
          onBlur={() => onBlur('firstName')}
        />
        <TextField
          label="Last name"
          placeholder="Doe"
          value={formData.lastName}
          error={getFieldError('lastName')}
          onChange={(value) => onChange('lastName', value)}
          onBlur={() => onBlur('lastName')}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DatePickerField
          label="Birth date"
          value={formData.birthDate}
          error={getFieldError('birthDate')}
          onChange={(date) => onChange('birthDate', date)}
          onBlur={() => onBlur('birthDate')}
        />
        <SelectField
          label="Gender"
          value={formData.gender}
          options={genderOptions}
          error={getFieldError('gender')}
          onChange={(value) => onChange('gender', value)}
          onBlur={() => onBlur('gender')}
        />
      </div>

      <TextField
        label="Email"
        type="email"
        placeholder="john@example.com"
        value={formData.email}
        error={getFieldError('email')}
        onChange={(value) => onChange('email', value)}
        onBlur={() => onBlur('email')}
      />

      <Field data-invalid={showPasswordError}>
        <FieldLabel>Password</FieldLabel>
        <FieldContent>
          <PasswordStrengthPopover
            password={formData.password}
            isOpen={isPasswordFocused}
            value={formData.password}
            onChange={(value) => onChange('password', value)}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => {
              setIsPasswordFocused(false);
              onBlur('password');
            }}
            hasError={showPasswordError}
          />
        </FieldContent>
        {showPasswordError && <FieldError>{passwordError}</FieldError>}
      </Field>

      <TextField
        label="Confirm password"
        type="password"
        placeholder="••••••••"
        value={formData.confirmPassword}
        error={getFieldError('confirmPassword')}
        onChange={(value) => onChange('confirmPassword', value)}
        onBlur={() => onBlur('confirmPassword')}
      />
    </form>
  );
}
