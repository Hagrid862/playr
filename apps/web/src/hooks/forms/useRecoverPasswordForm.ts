import { useCallback, useMemo, useState } from 'react';
import { RecoverPasswordRequestSchema } from '@repo/contracts';
import { z } from 'zod';

const RecoverPasswordFormSchema = RecoverPasswordRequestSchema.extend({
	confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword'],
});

export type FormData = z.infer<typeof RecoverPasswordFormSchema>;

export const useRecoverPasswordForm = () => {
	const [formData, setFormData] = useState<FormData>({
		email: '',
		otpCode: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
	const [isPasswordFocused, setIsPasswordFocused] = useState(false);

	const handleChange = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	}, []);

	// handles if user clicked on field to not show error before they even typed anything there
	const handleBlur = useCallback((field: keyof FormData) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	const errors = useMemo(() => {
		const result = RecoverPasswordFormSchema.safeParse(formData);

		if (result.success) return {};

		const errs: Partial<Record<keyof FormData, string>> = {};
		result.error.issues.forEach((issue) => {
			errs[issue.path[0] as keyof FormData] = issue.message;
		});
		return errs;
	}, [formData]);

	const isFormValid = useMemo(() => {
		const result = RecoverPasswordFormSchema.safeParse(formData);
		return result.success;
	}, [formData]);

	const handleSubmit = useCallback(() => {
		setTouched({ email: true, otpCode: true, newPassword: true, confirmPassword: true });

		const result = RecoverPasswordFormSchema.safeParse(formData);
		if (!result.success) return null;

		// Return only fields needed by API (exclude confirmPassword)
		const { email, otpCode, newPassword } = result.data;
		return { email, otpCode, newPassword };
	}, [formData]);

	const getFieldError = useCallback(
		(field: keyof FormData) => {
			return touched[field] ? errors[field] : undefined;
		},
		[errors, touched],
	);

	return {
		formData,
		touched,
		setTouched,
		errors,
		isFormValid,
		isPasswordFocused,
		setIsPasswordFocused,
		handleChange,
		handleBlur,
		handleSubmit,
		getFieldError,
	};
};
