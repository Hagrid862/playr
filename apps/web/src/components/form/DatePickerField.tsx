import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';

interface DatePickerFieldProps {
  label: string;
  value: Date | undefined;
  error?: string;
  onChange: (date: Date | undefined) => void;
  onBlur: () => void;
  fromYear?: number;
  toYear?: number;
}

export function DatePickerField({
  label,
  value,
  error,
  onChange,
  onBlur,
  fromYear = 1900,
  toYear = new Date().getFullYear(),
}: DatePickerFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive focus-visible:ring-destructive/50',
            )}
            onBlur={onBlur}
          >
            <CalendarIcon className="size-4 mr-2" />
            {value ? format(value, 'PPP') : <span>Pick a date</span>}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              onBlur();
            }}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            defaultMonth={value || new Date(2000, 0)}
          />
        </PopoverContent>
      </Popover>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
