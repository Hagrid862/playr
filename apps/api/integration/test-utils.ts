import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import { Reflector } from '@nestjs/core';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { ZodValidationPipe } from 'nestjs-zod';

/**
 * Creates a NestJS application configured for integration testing.
 * Uses a mocked PrismaService to avoid database dependencies.
 */
export async function createIntegrationApp(): Promise<{
  app: INestApplication;
  moduleFixture: TestingModule;
  prismaMock: PrismaServiceMock;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useClass(PrismaServiceMock)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Replicate global setup from main.ts
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ZodValidationPipe());

  await app.init();

  const prismaMock = app.get<PrismaServiceMock>(PrismaService);

  return { app, moduleFixture, prismaMock };
}
