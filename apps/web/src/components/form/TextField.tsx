import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useId } from 'react';

interface TextFieldProps {
  label: string;
  placeholder: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function TextField({
  label,
  placeholder,
  type = 'text',
  value,
  error,
  onChange,
  onBlur,
}: TextFieldProps) {
  const id = useId();
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={error ? 'border-destructive focus-visible:ring-destructive/50' : ''}
        />
      </FieldContent>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
