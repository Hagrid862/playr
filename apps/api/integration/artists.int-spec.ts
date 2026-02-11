import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FileBucket } from '@repo/db';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import { createIntegrationApp } from './test-utils';

vi.mock('@/shared/services/storage.service', () => ({
  StorageService: class {
    uploadFile = vi.fn().mockResolvedValue({ url: 'http://localhost/avatar.webp', key: 'key' });
    getFileUrl = vi.fn().mockReturnValue('http://localhost/avatar.webp');
  },
}));

describe('ArtistsController (Integration)', () => {
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

  // Since we can't easily override providers after app.init() in createIntegrationApp,
  // we might need to modify createIntegrationApp or handle it differently.
  // Actually, createIntegrationApp should probably be flexible.
  // But for now, I'll try to mock the service using vi.mock or just ignore it if I can.
  // Wait, I can't easily mock an injected service with vi.mock if it's already instantiated in Nest.
  // I should probably update artists.int-spec.ts to use a custom setup if needed.

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

  describe('POST /artists/:id/avatar', () => {
    it('should upload artist avatar successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';
      const userId = 'user-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: userId,
      } as any);

      prismaMock.client.artist.findFirst.mockResolvedValue({
        id: artistId,
        name: 'Test Artist',
      } as any);

      prismaMock.client.image.create.mockResolvedValue({
        id: 'img-123',
        alt: null,
        bucket: FileBucket.public,
        key: 'key',
        url: 'http://localhost/avatar.webp',
        mimeType: 'image/webp',
        blurhash: null,
        reportId: null,
        uploadStatus: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      prismaMock.client.artist.update.mockResolvedValue({
        id: artistId,
        avatarId: 'img-123',
      } as any);

      // We need to mock the transaction to return the result of the callback
      prismaMock.mainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(prismaMock.client);
      });

      const validPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post(`/artists/${artistId}/avatar`)
        .set('Authorization', authHeader)
        .attach('file', validPng, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(response.body.data.id).toBe('img-123');
      expect(response.body.data.url).toBe('http://localhost/avatar.webp');
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).post('/artists/123/avatar').expect(401);
    });
  });
});
