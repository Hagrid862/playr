import type { InjectionToken, Provider } from "@nestjs/common";
import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { PrismaClient } from "@repo/db";

/**
 * Creates a mocked PrismaClient and a provider for repository specs.
 * Pass your PrismaService class/token as the first argument.
 *
 * @example
 * ```ts
 * import { PrismaService } from '../services/prisma.service';
 * import { createPrismaMock } from '@repo/testing/nestjs';
 *
 * const { mockTx, prismaProvider } = createPrismaMock(PrismaService);
 *
 * const module = await Test.createTestingModule({
 *   providers: [ArtistRepository, prismaProvider],
 * }).compile();
 * ```
 */
export function createPrismaMock(prismaServiceToken: InjectionToken): {
  mockTx: DeepMocked<PrismaClient>;
  prismaProvider: Provider;
} {
  const mockTx = createMock<PrismaClient>();

  mockTx.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return arg(mockTx);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  });

  return {
    mockTx,
    prismaProvider: {
      provide: prismaServiceToken,
      useValue: {
        client: mockTx,
        mainClient: mockTx,
      },
    },
  };
}
