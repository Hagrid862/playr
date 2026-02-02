import { useMemo, useState, useCallback } from 'react';
import { z } from 'zod';
import { RegisterRequestSchema } from '@repo/contracts';

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
    const errs: FormErrors = {};

    if (formData.username) {
      if (formData.username.length < 3) {
        errs.username = 'Username must be at least 3 characters';
      } else if (formData.username.length > 32) {
        errs.username = 'Username must be at most 32 characters';
      } else if (!/^[a-z0-9_.]+$/.test(formData.username.toLowerCase())) {
        errs.username =
          'Username can only contain lowercase letters, numbers, underscores, and dots';
      }
    }

    if (formData.firstName) {
      if (formData.firstName.length < 1) {
        errs.firstName = 'First name is required';
      } else if (formData.firstName.length > 32) {
        errs.firstName = 'First name must be at most 32 characters';
      }
    }

    if (formData.lastName) {
      if (formData.lastName.length < 1) {
        errs.lastName = 'Last name is required';
      } else if (formData.lastName.length > 32) {
        errs.lastName = 'Last name must be at most 32 characters';
      }
    }

    if (formData.birthDate) {
      if (formData.birthDate > new Date()) {
        errs.birthDate = 'Birth date cannot be in the future';
      } else {
        const today = new Date();
        let age = today.getFullYear() - formData.birthDate.getFullYear();
        const monthDiff = today.getMonth() - formData.birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < formData.birthDate.getDate())) {
          age--;
        }
        if (age < 13) {
          errs.birthDate = 'You must be at least 13 years old to register';
        }
      }
    }

    if (formData.email) {
      const emailResult = z.string().email().safeParse(formData.email);
      if (!emailResult.success) {
        errs.email = 'Invalid email address';
      } else if (formData.email.length > 256) {
        errs.email = 'Email must be at most 256 characters';
      }
    }

    if (formData.password) {
      if (formData.password.length < 8) {
        errs.password = 'Password must be at least 8 characters';
      } else if (formData.password.length > 128) {
        errs.password = 'Password must be at most 128 characters';
      } else if (!/[A-Z]/.test(formData.password)) {
        errs.password = 'Password must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(formData.password)) {
        errs.password = 'Password must contain at least one lowercase letter';
      } else if (!/[0-9]/.test(formData.password)) {
        errs.password = 'Password must contain at least one number';
      }
    }

    if (formData.confirmPassword) {
      if (formData.confirmPassword !== formData.password) {
        errs.confirmPassword = 'Passwords do not match';
      }
    }

    return errs;
  }, [formData]);

  const isFormValid = useMemo(() => {
    const allFieldsFilled =
      formData.username.trim() !== '' &&
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.birthDate !== undefined &&
      formData.gender !== '' &&
      formData.email.trim() !== '' &&
      formData.password !== '' &&
      formData.confirmPassword !== '';

    const noErrors = Object.keys(errors).length === 0;
    return allFieldsFilled && noErrors;
  }, [formData, errors]);

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      touchAllFields();

      if (!isFormValid) {
        return null;
      }

      const requestData = {
        username: formData.username.toLowerCase().trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate!.toISOString(),
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
    },
    [formData, isFormValid, touchAllFields],
  );

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
