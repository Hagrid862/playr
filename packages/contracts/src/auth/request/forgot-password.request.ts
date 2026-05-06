import {z} from "zod";

export const forgotPasswordRequestSchema = z.object({
	email: z
		.email("Invalid email address")
		.max(256, "Email must be at most 256 characters")
		.transform((val) => val.toLowerCase().trim()),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;