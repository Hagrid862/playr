import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@repo/db';
import { DeepMockProxy, mockDeep } from 'vitest-mock-extended';

@Injectable()
export class PrismaServiceMock {
  public client: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

  constructor() {
    // Basic setup for $transaction to just execute the callback
    this.client.$transaction.mockImplementation(async (callback) => {
      return callback(this.client);
    });

    // Setup fluent API for common models if needed
    // Example: this.client.user.findUnique.mockReturnThis();
  }

  async onModuleInit() {
    // Do nothing
  }

  async onModuleDestroy() {
    // Do nothing
  }
}
