import type { PrismaClient } from "@repo/db";
import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import type { PrismaService } from "./prisma-service.types";

/**
 * Creates a type-safe DeepMocked PrismaClient.
 * Use for unit tests where you need to mock individual Prisma delegate methods.
 */
export function createMockPrismaClient(): DeepMocked<PrismaClient> {
  const client = createMock<PrismaClient>();
  // Default $transaction to execute callback with the mock client
  client.$transaction.mockImplementation(
    async (callback: (tx: DeepMocked<PrismaClient>) => unknown) =>
      typeof callback === "function" ? callback(client) : callback,
  );
  return client;
}

/**
 * Creates a PrismaService-like object that exposes a .client getter.
 * Use when testing handlers/repositories that access prisma.client.
 */
export function createMockPrismaService(options?: {
  client?: DeepMocked<PrismaClient>;
}): PrismaService {
  const client = options?.client ?? createMockPrismaClient();
  return {
    get client() {
      return client;
    },
    get mainClient() {
      return client;
    },
    async onModuleInit() {},
    async onModuleDestroy() {},
  } as PrismaService;
}
