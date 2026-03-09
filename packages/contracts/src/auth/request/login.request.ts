import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z
    .email("Invalid email address")
    .max(256, "Email must be at most 256 characters")
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
