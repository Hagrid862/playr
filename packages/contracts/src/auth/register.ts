import { Gender } from "@repo/db";
import { z } from "zod";
import { createApiResponseSchema } from "../api/response.schema";
import { UserSchema } from "../schemas/user.schema";
import { zodDateOnly } from "../utils/zod-date";
import { zodEmail, zodPassword, zodRequiredString } from "../utils/zod-shared";

export const RegisterRequestSchema = z.object({
  username: zodRequiredString("Username is required")
    .pipe(
      z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(32, "Username must be at most 32 characters")
        .regex(
          /^[a-z0-9_.]+$/,
          "Username can only contain lowercase letters, numbers, underscores, and dots",
        ),
    )
    .transform((val: string) => val.toLowerCase().trim()),
  firstName: zodRequiredString("First name is required").pipe(
    z.string().max(32, "First name must be at most 32 characters"),
  ),
  lastName: zodRequiredString("Last name is required").pipe(
    z.string().max(32, "Last name must be at most 32 characters"),
  ),
  birthDate: zodDateOnly("Invalid date format", "Birth date is required")
    .refine((val: unknown) => {
      const v = val as string;
      if (!v) return false;
      const today = new Date();
      const todayStr = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      return v <= todayStr;
    }, "Birth date cannot be in the future")
    .refine((val: unknown) => {
      const v = val as string;
      if (!v) return false;
      const [y, m, d] = v.split("-").map(Number);
      const today = new Date();
      const currentY = today.getFullYear();
      const currentM = today.getMonth() + 1;
      const currentD = today.getDate();

      let age = currentY - y;
      if (currentM < m || (currentM === m && currentD < d)) {
        age--;
      }
      return age >= 13;
    }, "You must be at least 13 years old to register"),
  gender: z
    .preprocess(
      (val) =>
        val === "" || val === undefined || val === null ? undefined : val,
      z.unknown(),
    )
    .pipe(
      z.enum(Gender, {
        message: "Gender is required",
      }),
    ),
  email: zodEmail("Invalid email address").pipe(
    z.string().max(256, "Email must be at most 256 characters"),
  ),
  password: zodPassword(),
});

export const RegisterResponseSchema = createApiResponseSchema(UserSchema);

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
