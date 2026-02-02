import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react';

interface PasswordStrengthPopoverProps {
  password: string;
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  hasError: boolean;
}

export function PasswordStrengthPopover({
  password,
  isOpen,
  value,
  onChange,
  onFocus,
  onBlur,
  hasError,
}: PasswordStrengthPopoverProps) {
  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    const checks = Object.values(passwordChecks);
    return checks.filter(Boolean).length;
  }, [passwordChecks]);

  const strengthInfo = useMemo(() => {
    if (password.length === 0) return { label: '', color: '', bgColor: '' };
    if (strengthScore <= 2) return { label: 'Weak', color: 'text-red-500', bgColor: 'bg-red-500' };
    if (strengthScore === 3)
      return { label: 'Fair', color: 'text-orange-500', bgColor: 'bg-orange-500' };
    if (strengthScore === 4) return { label: 'Good', color: 'text-primary', bgColor: 'bg-primary' };
    return { label: 'Excellent', color: 'text-emerald-500', bgColor: 'bg-emerald-500' };
  }, [strengthScore, password.length]);

  const requirements = [
    { key: 'minLength', label: 'At least 8 characters', met: passwordChecks.minLength },
    { key: 'hasLowercase', label: 'One lowercase letter', met: passwordChecks.hasLowercase },
    { key: 'hasUppercase', label: 'One uppercase letter', met: passwordChecks.hasUppercase },
    { key: 'hasNumber', label: 'One number', met: passwordChecks.hasNumber },
    {
      key: 'hasSpecial',
      label: 'One special character',
      met: passwordChecks.hasSpecial,
      optional: true,
    },
  ];

  return (
    <Popover open={isOpen && password.length > 0}>
      <PopoverTrigger asChild>
        <Input
          type="password"
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={hasError ? 'border-destructive focus-visible:ring-destructive/50' : ''}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-4"
        side="bottom"
        sideOffset={4}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Password strength</span>
              <span className={`text-sm font-semibold ${strengthInfo.color}`}>
                {strengthInfo.label}
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    level <= strengthScore ? strengthInfo.bgColor : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Requirements
            </span>
            {requirements.map((req) => (
              <div key={req.key} className="flex items-center gap-2 text-sm">
                {req.met ? (
                  <CheckCircleIcon className="size-4 text-primary shrink-0" weight="fill" />
                ) : (
                  <XCircleIcon className="size-4 text-muted-foreground shrink-0" weight="fill" />
                )}
                <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                  {req.label}
                  {req.optional && (
                    <span className="text-xs text-muted-foreground ml-1">(bonus)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
