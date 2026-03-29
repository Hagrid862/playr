import z from "zod";

export const VerifyEmailRequestSchema = z.object({
  email: z
    .email("Invalid email address")
    .max(256, "Email must be at most 256 characters")
    .transform((val) => val.toLowerCase().trim()),
  otpCode: z
    .string()
    .regex(/^[0-9]+$/, "OTP code must contain only digits")
    .length(8, "OTP code must be exactly 8 digits")
    .transform((val) => val.trim()),
});

export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;