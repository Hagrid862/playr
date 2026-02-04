import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient, createPrismaClient } from '@repo/db';
import { UnitOfWorkService } from './unit-of-work.service';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor(
    @Inject(forwardRef(() => UnitOfWorkService))
    private readonly unitOfWork: UnitOfWorkService,
  ) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.prisma = createPrismaClient(databaseUrl);
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  get client() {
    return this.unitOfWork.getTransactionalClient() || this.prisma;
  }

  get mainClient() {
    return this.prisma;
  }
}
