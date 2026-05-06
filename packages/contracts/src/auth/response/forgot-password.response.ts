import {createApiResponseSchema} from "../../api";
import {z} from "zod";

export const forgotPasswordResponseSchema = createApiResponseSchema(
	z.object({
		isEmailSent: z.boolean(),
	}),
);

export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>;