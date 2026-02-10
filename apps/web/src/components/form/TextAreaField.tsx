import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useId } from 'react';

interface TextAreaFieldProps {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  className?: string;
}

export function TextAreaField({
  label,
  placeholder,
  value,
  error,
  onChange,
  onBlur,
  className,
}: TextAreaFieldProps) {
  const id = useId();
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${className} ${error ? 'border-destructive focus-visible:ring-destructive/50' : ''}`}
        />
      </FieldContent>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
