import { z } from "zod";

/**
 * Enterprise Zod helpers for consistent validation messages
 * Ultra-compatible version for custom Zod environments
 */

const required = (message: string): z.ZodType<unknown, unknown> =>
  z
    .preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.unknown(),
    )
    .refine((val) => val !== undefined, message);

export const zodRequiredString = (
  message: string,
): z.ZodType<string, unknown> =>
  required(message).pipe(z.string().min(1, message));

export const zodEmail = (
  message = "Invalid email address",
): z.ZodType<string, unknown> =>
  zodRequiredString("Email is required").pipe(z.string().email(message));

export const zodPassword = (): z.ZodType<string, unknown> =>
  zodRequiredString("Password is required").pipe(
    z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  );
