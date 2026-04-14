import { VerifyEmailRequest } from '@repo/contracts';
import { useCallback, useMemo, useState } from 'react';
import { VerifyEmailRequestSchema } from '@repo/contracts';

export type FormData = VerifyEmailRequest;

export const useVerifyEmailForm = () => {
  const [formData, setFormData] = useState<FormData>({ email: '', otpCode: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const handleChange  = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // handles if user clicked on field to not show error before they even typed anything there
  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const errors = useMemo(() => {
    const result = VerifyEmailRequestSchema.safeParse(formData);

    if (result.success) return {};

    const errs: Partial<Record<keyof FormData, string>> = {};
    result.error.issues.forEach((issue) => {
      errs[issue.path[0] as keyof FormData] = issue.message;
    });
    return errs;
  }, [formData]);

  const isFormValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleSubmit = useCallback(() => {
    setTouched({ email: true, otpCode: true });

    const result = VerifyEmailRequestSchema.safeParse(formData);
    return result.success ? result.data : null;
  }, [formData]);

  const getFieldError = useCallback((field: keyof FormData) => {
    return touched[field] ? errors[field] : undefined;
  }, [errors, touched]);

  return {
    formData,
    touched,
    errors,
    isFormValid,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
  };
};
