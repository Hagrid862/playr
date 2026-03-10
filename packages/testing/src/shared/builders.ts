/**
 * Type-safe test data builders.
 * Use Partial<T> overrides to customize fixtures while keeping required fields.
 */

/**
 * Merges default values with overrides. Ensures the result is fully typed.
 */
export function buildWithOverrides<T extends object>(
  defaults: T,
  overrides: Partial<T> = {},
): T {
  return { ...defaults, ...overrides } as T;
}
