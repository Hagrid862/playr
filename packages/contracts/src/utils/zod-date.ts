import { z } from "zod";

/**
 * Creates a Zod schema for date-only strings (YYYY-MM-DD).
 * Use this for fields like birthdays where timezone shifts must be avoided.
 */
export const zodDateOnly = (
  errorMessage = "Invalid date format (YYYY-MM-DD)",
) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, errorMessage)
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && val === date.toISOString().split("T")[0];
    }, "Invalid calendar date");

/**
 * Creates a nullable Zod schema for date-only strings
 */
export const zodDateOnlyNullable = (
  errorMessage = "Invalid date format (YYYY-MM-DD)",
) => zodDateOnly(errorMessage).nullable();
