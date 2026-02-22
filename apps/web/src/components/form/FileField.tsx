import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XIcon } from '@phosphor-icons/react';
import { useId } from 'react';

interface FileFieldProps {
  label: string;
  placeholder?: string;
  accept?: string;
  error?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  onBlur: () => void;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  showClearButton?: boolean;
}

export function FileField({
  label,
  placeholder,
  accept,
  error,
  value,
  onChange,
  onBlur,
  className,
  inputRef,
  showClearButton,
}: FileFieldProps) {
  const id = useId();

  const handleClear = () => {
    onChange(null);
    if (inputRef?.current) {
      inputRef.current.value = '';
    } else {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = '';
    }
  };

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-2">
          <Input
            id={id}
            ref={inputRef}
            type="file"
            accept={accept}
            placeholder={placeholder}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                onChange(file);
              } else if (value) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(value);
                e.target.files = dataTransfer.files;
              } else {
                onChange(null);
              }
            }}
            onBlur={onBlur}
            className={error ? 'border-destructive focus-visible:ring-destructive/50' : ''}
          />
          {showClearButton && value && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleClear}
            >
              <XIcon />
              <span className="sr-only">Clear file</span>
            </Button>
          )}
        </div>
      </FieldContent>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
