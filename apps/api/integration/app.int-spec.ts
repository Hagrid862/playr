import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createIntegrationApp } from './test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.data).toBe('OK');
  });
});
