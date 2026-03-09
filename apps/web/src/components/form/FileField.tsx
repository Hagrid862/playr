import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useId } from 'react';

interface FileFieldProps {
  label: string;
  placeholder?: string;
  accept?: string;
  error?: string;
  onChange: (file: File | null) => void;
  onBlur: () => void;
  className?: string;
}

export function FileField({
  label,
  placeholder,
  accept,
  error,
  onChange,
  onBlur,
  className,
}: FileFieldProps) {
  const id = useId();

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Input
          id={id}
          type="file"
          accept={accept}
          placeholder={placeholder}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            onChange(file);
          }}
          onBlur={onBlur}
          className={error ? 'border-destructive focus-visible:ring-destructive/50' : ''}
        />
      </FieldContent>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
