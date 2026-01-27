import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@repo/db';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

@Injectable()
export class PrismaServiceMock {
  public client: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

  async onModuleInit() {
    // Do nothing
  }

  async onModuleDestroy() {
    // Do nothing
  }
}
