import { CreateArtistRequest, CreateArtistRequestSchema } from '@repo/contracts';
import { useCallback, useMemo, useState } from 'react';

export type FormData = CreateArtistRequest;

export const useCreateArtistForm = () => {
  const [formData, setFormData] = useState<FormData>({ name: '', description: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const handleChange = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const errors = useMemo(() => {
    const result = CreateArtistRequestSchema.safeParse(formData);
    if (result.success) return {};

    const errs: Partial<Record<keyof FormData, string>> = {};
    result.error.issues.forEach((issue) => {
      errs[issue.path[0] as keyof FormData] = issue.message;
    });
    return errs;
  }, [formData]);

  const isFormValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleSubmit = useCallback(() => {
    setTouched({ name: true, description: true });
    const result = CreateArtistRequestSchema.safeParse(formData);
    return result.success ? result.data : null;
  }, [formData]);

  const getFieldError = useCallback(
    (field: keyof FormData) => (touched[field] ? errors[field] : undefined),
    [touched, errors],
  );

  return {
    formData,
    errors,
    touched,
    isFormValid,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
  };
};
