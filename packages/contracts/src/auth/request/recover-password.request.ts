import {z} from "zod";
import {zodPassword} from "../../utils/zod-shared";

export const RecoverPasswordRequestSchema = z.object({
	email: z
		.email("Invalid email address")
		.max(256, "Email must be at most 256 characters")
		.transform((val) => val.toLowerCase().trim()),
	otpCode: z
		.string()
		.regex(/^[0-9]+$/, "OTP code must contain only digits")
		.length(8, "OTP code must be exactly 8 digits")
		.transform((val) => val.trim()),
	newPassword: zodPassword(),
});

export type RecoverPasswordRequest = z.infer<typeof RecoverPasswordRequestSchema>;