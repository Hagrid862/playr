import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@repo/db';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';

@Injectable()
export class PrismaServiceMock {
  public client: DeepMocked<PrismaClient> = createMock<PrismaClient>();

  constructor() {
    // Basic setup for $transaction to just execute the callback
    this.client.$transaction.mockImplementation(async (callback: any) => {
      return typeof callback === 'function' ? callback(this.client) : callback;
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
