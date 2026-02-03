import { useMemo, useState, useCallback } from 'react';
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

/**
 * Pure validation function that validates form data against the schema
 * Applies consistent normalization for username and email
 */
function validateFormData(formData: FormData): FormErrors {
  const errs: FormErrors = {};

  // Validate username using shared schema with normalization
  if (!formData.username.trim()) {
    errs.username = 'Username is required';
  } else {
    const usernameResult = RegisterRequestSchema.shape.username.safeParse(
      formData.username.toLowerCase().trim(),
    );
    if (!usernameResult.success) {
      errs.username = usernameResult.error.issues[0]?.message || 'Invalid username';
    }
  }

  // Validate firstName using shared schema
  if (!formData.firstName.trim()) {
    errs.firstName = 'First name is required';
  } else {
    const firstNameResult = RegisterRequestSchema.shape.firstName.safeParse(formData.firstName);
    if (!firstNameResult.success) {
      errs.firstName = firstNameResult.error.issues[0]?.message || 'Invalid first name';
    }
  }

  // Validate lastName using shared schema
  if (!formData.lastName.trim()) {
    errs.lastName = 'Last name is required';
  } else {
    const lastNameResult = RegisterRequestSchema.shape.lastName.safeParse(formData.lastName);
    if (!lastNameResult.success) {
      errs.lastName = lastNameResult.error.issues[0]?.message || 'Invalid last name';
    }
  }

  // Validate birthDate using shared schema
  if (!formData.birthDate) {
    errs.birthDate = 'Birth date is required';
  } else {
    const birthDateResult = RegisterRequestSchema.shape.birthDate.safeParse(
      formData.birthDate.toISOString(),
    );
    if (!birthDateResult.success) {
      errs.birthDate = birthDateResult.error.issues[0]?.message || 'Invalid birth date';
    }
  }

  // Validate gender using shared schema
  if (!formData.gender) {
    errs.gender = 'Gender is required';
  } else {
    const genderResult = RegisterRequestSchema.shape.gender.safeParse(formData.gender);
    if (!genderResult.success) {
      errs.gender = genderResult.error.issues[0]?.message || 'Invalid gender';
    }
  }

  // Validate email using shared schema with normalization
  if (!formData.email.trim()) {
    errs.email = 'Email is required';
  } else {
    const emailResult = RegisterRequestSchema.shape.email.safeParse(
      formData.email.toLowerCase().trim(),
    );
    if (!emailResult.success) {
      errs.email = emailResult.error.issues[0]?.message || 'Invalid email';
    }
  }

  // Validate password using shared schema
  if (!formData.password) {
    errs.password = 'Password is required';
  } else {
    const passwordResult = RegisterRequestSchema.shape.password.safeParse(formData.password);
    if (!passwordResult.success) {
      errs.password = passwordResult.error.issues[0]?.message || 'Invalid password';
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

  const checkFormValid = useCallback(() => {
    const allFieldsFilled =
      formData.username.trim() !== '' &&
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.birthDate !== undefined &&
      formData.gender !== '' &&
      formData.email.trim() !== '' &&
      formData.password !== '' &&
      formData.confirmPassword !== '';

    if (!allFieldsFilled) {
      return false;
    }

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      touchAllFields();

      const isValid = checkFormValid();
      if (!isValid) {
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
    [formData, checkFormValid, touchAllFields],
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
