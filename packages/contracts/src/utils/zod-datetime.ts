import z from "zod";

/**
 * Creates a Zod schema for datetime fields that:
 * 1. Accepts both Date objects and ISO datetime strings (flexible input)
 * 2. Converts Date objects to ISO strings for JSON Schema compatibility
 * 3. Transforms back to Date objects for output type satisfaction
 */
export const zodDateTime = () =>
  z
    .preprocess((val) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    }, z.iso.datetime())
    .transform((val) => new Date(val));

/**
 * Creates a nullable Zod schema for datetime fields
 */
export const zodDateTimeNullable = () =>
  z
    .preprocess((val) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    }, z.iso.datetime().nullable())
    .transform((val) => (val ? new Date(val) : null));
