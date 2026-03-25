import z from "zod";

export const VerifyEmailRequestSchema = z.object({
  email: z.string().email(),
  otpCode: z.string().length(8),
});

export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;