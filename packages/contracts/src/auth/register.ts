import { z } from "zod";
import { createApiResponseSchema } from "../api/response.schema";
import { UserSchema } from "../schemas/user.schema";
import { Gender } from "@repo/db";

export const RegisterRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(
      /^[a-z0-9_.]+$/,
      "Username can only contain lowercase letters, numbers, underscores, and dots",
    )
    .transform((val) => val.toLowerCase().trim()),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(32, "First name must be at most 32 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(32, "Last name must be at most 32 characters"),
  birthDate: z
    .string()
    .refine(
      (val) => !isNaN(new Date(val).getTime()),
      "Invalid birth date format",
    )
    .refine(
      (val) => new Date(val) <= new Date(),
      "Birth date cannot be in the future",
    )
    .refine((val) => {
      const birthDate = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age >= 13;
    }, "You must be at least 13 years old to register"),
  gender: z.enum(Gender),
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

export const RegisterResponseSchema = createApiResponseSchema(UserSchema);

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
