import './setup-env';

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/shared/services/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import type Redis from 'ioredis';
import { RedisProvider } from '../src/features/playback/utils/redis.provider';
import { createFakePlaybackRedis, type FakePlaybackRedis } from './fake-playback-redis';

// Mock BullMQ to avoid Redis connections in integration tests
vi.mock('@nestjs/bullmq', async () => {
  const actual = await vi.importActual<any>('@nestjs/bullmq');

  class MockBullModule {
    static forRootAsync() {
      return {
        module: MockBullModule,
        providers: [],
        exports: [],
      };
    }

    static registerQueue(...queues: any[]) {
      const providers = queues.map((q: any) => ({
        provide: actual.getQueueToken(q.name),
        useValue: {
          add: vi.fn(),
          process: vi.fn(),
          close: vi.fn(),
          on: vi.fn(),
        },
      }));

      return {
        module: MockBullModule,
        providers,
        exports: providers.map((p: any) => p.provide),
      };
    }
  }

  return {
    ...actual,
    BullModule: MockBullModule,
  };
});

/**
 * Creates a NestJS application configured for integration testing.
 * Uses a mocked PrismaService to avoid database dependencies.
 * Replaces playback `RedisProvider` with an in-memory fake so tests do not require Redis.
 */
export async function createIntegrationApp(
  builder: (module: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<{
  app: INestApplication;
  moduleFixture: TestingModule;
  prismaMock: PrismaServiceMock;
  /** In-memory double for `PLAYBACK_REDIS` (no real Redis required). */
  playbackRedis: FakePlaybackRedis;
}> {
  const playbackRedis = createFakePlaybackRedis();

  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useClass(PrismaServiceMock)
    .overrideProvider('REDIS_CLIENT')
    .useValue({
      get: vi.fn(),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn(),
      eval: vi.fn(),
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue('OK'),
    })
    .overrideProvider(RedisProvider)
    .useValue({
      client: playbackRedis as unknown as Redis,
      onModuleDestroy: async () => {},
    })
    .overrideProvider(MailerService)
    .useValue({
      sendMail: vi.fn().mockResolvedValue({}),
    });

  moduleBuilder = builder(moduleBuilder);

  const moduleFixture = await moduleBuilder.compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());

  // Replicate global setup from main.ts
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(ConfigService)));
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ZodValidationPipe());

  await app.init();

  const prismaMock = app.get<PrismaServiceMock>(PrismaService);

  return { app, moduleFixture, prismaMock, playbackRedis };
}
