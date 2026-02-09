import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import { createIntegrationApp } from './test-utils';

describe('LibraryController (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let jwtService: JwtService;
  let config: ConfigService;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prismaMock = setup.prismaMock;
    jwtService = app.get(JwtService);
    config = app.get(ConfigService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const getAuthHeader = async (userId: string = 'user-123') => {
    const token = await jwtService.signAsync(
      { sub: userId, username: 'testuser', sessionId: 'session-123' },
      {
        secret: config.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
    return `Bearer ${token}`;
  };

  describe('POST /library', () => {
    it('should create a library successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(null);
      prismaMock.client.library.create.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app.getHttpServer())
        .post('/library')
        .set('Authorization', authHeader)
        .expect(201);

      expect(response.body.data.userId).toBe('user-123');
    });

    it('should return 409 if library already exists', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'existing-lib',
      } as any);

      await request(app.getHttpServer())
        .post('/library')
        .set('Authorization', authHeader)
        .expect(409);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).post('/library').expect(401);
    });
  });

  describe('GET /library', () => {
    it('should get user library (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      const response = await request(app.getHttpServer())
        .get('/library')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe('lib-123');
    });

    it('should return 404 if library not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });
});
