import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@repo/db';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';

@Injectable()
export class PrismaServiceMock {
  private readonly _mockClient: DeepMocked<PrismaClient> = createMock<PrismaClient>();

  constructor() {
    // Basic setup for $transaction to just execute the callback
    this._mockClient.$transaction.mockImplementation(async (callback: any) => {
      return typeof callback === 'function' ? callback(this._mockClient) : callback;
    });
  }

  get client() {
    return this._mockClient;
  }

  get mainClient() {
    return this._mockClient;
  }

  async onModuleInit() {
    // Do nothing
  }

  async onModuleDestroy() {
    // Do nothing
  }
}
