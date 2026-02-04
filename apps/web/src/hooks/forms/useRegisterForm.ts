import { useMemo, useState, useCallback } from 'react';
import { RegisterRequestSchema } from '@repo/contracts';
import { format } from 'date-fns';

export type FormData = {
  username: string;
  firstName: string;
  lastName: string;
  birthDate: Date | undefined;
  gender: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type FormErrors = Partial<Record<keyof FormData, string>>;
export type TouchedFields = Partial<Record<keyof FormData, boolean>>;

const initialFormData: FormData = {
  username: '',
  firstName: '',
  lastName: '',
  birthDate: undefined,
  gender: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/**
 * Pure validation function that validates form data against the schema
 * Applies consistent normalization for username and email
 */
function validateFormData(formData: FormData): FormErrors {
  const errs: FormErrors = {};

  // Form Zod-compatible object
  const dataToValidate = {
    ...formData,
    username: formData.username.toLowerCase().trim(),
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    birthDate: formData.birthDate ? format(formData.birthDate, 'yyyy-MM-dd') : undefined,
    gender: formData.gender || undefined,
    email: formData.email.toLowerCase().trim(),
  };

  const safeParseResult = RegisterRequestSchema.safeParse(dataToValidate);

  if (!safeParseResult.success) {
    for (const issue of safeParseResult.error.issues) {
      const path = issue.path[0] as keyof FormData;
      if (!errs[path]) {
        errs[path] = issue.message;
      }
    }
  }

  // Frontend-specific validation: confirmPassword
  if (!formData.confirmPassword) {
    errs.confirmPassword = 'Please confirm your password';
  } else if (formData.confirmPassword !== formData.password) {
    errs.confirmPassword = 'Passwords do not match';
  }

  return errs;
}

export function useRegisterForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleChange = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const errors = useMemo<FormErrors>(() => {
    return validateFormData(formData);
  }, [formData]);

  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const checkFormValid = useCallback(() => {
    const errs = validateFormData(formData);
    return Object.keys(errs).length === 0;
  }, [formData]);

  const touchAllFields = useCallback(() => {
    setTouched({
      username: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      gender: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
  }, []);

  const handleSubmit = useCallback(() => {
    touchAllFields();

    const isValid = checkFormValid();
    if (!isValid) {
      return null;
    }

    const requestData = {
      username: formData.username.toLowerCase().trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      birthDate: format(formData.birthDate!, 'yyyy-MM-dd'),
      gender: formData.gender,
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
    };

    const result = RegisterRequestSchema.safeParse(requestData);
    if (!result.success) {
      console.error('Validation failed:', result.error);
      return null;
    }

    return result.data;
  }, [formData, checkFormValid, touchAllFields]);

  const getFieldError = useCallback(
    (field: keyof FormData) => {
      return touched[field] ? errors[field] : undefined;
    },
    [touched, errors],
  );

  const showPasswordError = Boolean(touched.password && !isPasswordFocused && errors.password);

  return {
    formData,
    errors,
    touched,
    isFormValid,
    isPasswordFocused,
    showPasswordError,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
    setIsPasswordFocused,
  };
}
