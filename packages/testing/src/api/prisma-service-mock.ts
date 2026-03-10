import { createMockPrismaClient } from './prisma';
import type { DeepMocked } from '@golevelup/ts-vitest';
import type { PrismaClient } from '@repo/db';

/**
 * NestJS-injectable PrismaService mock for integration tests.
 * Use with .overrideProvider(PrismaService).useClass(PrismaServiceMock)
 */
export class PrismaServiceMock {
  private readonly _mockClient = createMockPrismaClient();

  get client(): DeepMocked<PrismaClient> {
    return this._mockClient;
  }

  get mainClient(): DeepMocked<PrismaClient> {
    return this._mockClient;
  }

  async onModuleInit(): Promise<void> {}

  async onModuleDestroy(): Promise<void> {}
}
