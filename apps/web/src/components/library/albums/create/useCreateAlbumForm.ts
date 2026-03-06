import { CreateLibraryAlbumRequest, CreateLibraryAlbumRequestSchema } from '@repo/contracts';
import { useCallback, useMemo, useState } from 'react';

export type FormData = CreateLibraryAlbumRequest;

export const useCreateAlbumForm = (
  artistId: string,
  initialType: CreateLibraryAlbumRequest['type'] = 'album',
) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: initialType,
    artistId: artistId,
    releaseDate: null,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const handleChange = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const errors = useMemo(() => {
    const result = CreateLibraryAlbumRequestSchema.safeParse(formData);
    if (result.success) return {};

    const errs: Partial<Record<keyof FormData, string>> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === 'string' && field in formData) {
        errs[field as keyof FormData] = issue.message;
      }
    });
    return errs;
  }, [formData]);

  const isFormValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleSubmit = useCallback(() => {
    // Touch all fields on submit
    setTouched({
      name: true,
      description: true,
      type: true,
      artistId: true,
      releaseDate: true,
    });
    const result = CreateLibraryAlbumRequestSchema.safeParse(formData);
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
