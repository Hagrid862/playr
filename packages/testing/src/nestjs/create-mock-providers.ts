import type { InjectionToken, Provider } from "@nestjs/common";

/**
 * Builds an array of NestJS providers from tuples of [token, mock].
 * Useful for handler specs with multiple mocked dependencies.
 *
 * @example
 * ```ts
 * import { createMock, createMockProviders } from '@repo/testing/nestjs';
 *
 * const providers = createMockProviders([
 *   [UserRepository, createMock<UserRepository>()],
 *   [HashingService, createMock<HashingService>()],
 * ]);
 * ```
 */
export function createMockProviders(
  entries: Array<[InjectionToken, unknown]>,
): Provider[] {
  return entries.map(([provide, useValue]) => ({ provide, useValue }));
}
