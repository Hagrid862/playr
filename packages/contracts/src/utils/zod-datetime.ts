import z from "zod";

/**
 * Creates a Zod schema for datetime fields that:
 * 1. Accepts both Date objects and ISO datetime strings (flexible input)
 * 2. Converts Date objects to ISO strings for JSON Schema compatibility
 * 3. Outputs as string (JSON compatible) - use `.transform(v => new Date(v))` if you need Date objects
 */
export const zodDateTime = () =>
  z
    .preprocess((val) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    }, z.string())
    .transform((val) => new Date(val));

/**
 * Creates a nullable Zod schema for datetime fields
 */
export const zodDateTimeNullable = () =>
  z
    .preprocess((val) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    }, z.string().nullable())
    .transform((val) => (val ? new Date(val) : null));
