import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import { createIntegrationApp } from './test-utils';

describe('PrivateProfileController (Integration)', () => {
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

  describe('POST /private-profile', () => {
    it('should create a private profile successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const userId = 'user-123';

      // Mock checking if profile exists (return null for not found)
      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue(null);

      // Mock creation
      prismaMock.client.userPrivateProfile.create.mockResolvedValue({
        id: 'pp-123',
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request(app.getHttpServer())
        .post('/private-profile')
        .set('Authorization', authHeader)
        .expect(201);

      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.id).toBe('pp-123');
    });

    it('should return 409 if private profile already exists', async () => {
      const authHeader = await getAuthHeader();
      const userId = 'user-123';

      // Mock finding existing profile
      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'existing-pp',
        userId: userId,
      } as any);

      await request(app.getHttpServer())
        .post('/private-profile')
        .set('Authorization', authHeader)
        .expect(409);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).post('/private-profile').expect(401);
    });
  });

  describe('GET /private-profile', () => {
    it('should return the private profile (200)', async () => {
      const authHeader = await getAuthHeader();
      const userId = 'user-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: userId,
      } as any);

      const response = await request(app.getHttpServer())
        .get('/private-profile')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe('pp-123');
      expect(response.body.data.userId).toBe(userId);
    });

    it('should return 404 if private profile not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/private-profile')
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).get('/private-profile').expect(401);
    });
  });
});
