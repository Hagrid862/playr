/**
 * Minimal PrismaService interface for testing.
 * Matches the shape used by NestJS PrismaService in this repo.
 */
import type { PrismaClient } from '@repo/db';

export interface PrismaService {
  readonly client: PrismaClient;
  readonly mainClient: PrismaClient;
  onModuleInit(): Promise<void>;
  onModuleDestroy(): Promise<void>;
}
