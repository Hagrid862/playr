import {createApiResponseSchema} from "../../api";
import {z} from "zod";

export const ForgotPasswordResponseSchema = createApiResponseSchema(
	z.object({
		isEmailSent: z.boolean(),
	}),
);

export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;