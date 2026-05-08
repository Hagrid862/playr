import { z } from "zod";

export const ForgotPasswordRequestSchema = z.object({
  email: z
    .email("Invalid email address")
    .max(256, "Email must be at most 256 characters")
    .transform((val) => val.toLowerCase().trim()),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
