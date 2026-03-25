import z from "zod";

export const VerifyEmailRequestSchema = z.object({
  email: z
    .email("Invalid email address")
    .max(256, "Email must be at most 256 characters")
    .transform((val) => val.toLowerCase().trim()),
  otpCode: z
    .string()
    .length(8)
    .transform((val) => val.toLowerCase().trim()),
});

export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;