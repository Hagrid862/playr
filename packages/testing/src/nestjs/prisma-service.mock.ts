import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@repo/db";

@Injectable()
export class PrismaServiceMock {
  private readonly _mockClient: DeepMocked<PrismaClient> =
    createMock<PrismaClient>();

  constructor() {
    this._mockClient.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg(this._mockClient);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    });
  }

  get client() {
    return this._mockClient;
  }

  get mainClient() {
    return this._mockClient;
  }

  async onModuleInit() {
    // No-op for testing
  }

  async onModuleDestroy() {
    // No-op for testing
  }
}
