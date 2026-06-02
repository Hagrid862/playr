import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { albumBuilder, artistBuilder, trackBuilder } from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';
import './setup-env';

describe('ListenHistoryController (Integration)', () => {
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
    setupJwtAuthPrismaMocks(prismaMock);
  });

  afterAll(async () => {
    await app.close();
  });

  const getAuthHeader = async (userId: string = 'user-123') => {
    const token = await jwtService.signAsync(
      { sub: userId, username: 'testuser', sessionId: 'session-123' },
      {
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
    return `Bearer ${token}`;
  };

  describe('GET /history', () => {
    it('should return user listening history paginated (200)', async () => {
      const authHeader = await getAuthHeader();

      const mockTrack = {
        ...trackBuilder({ id: 'track-1', albumId: 'album-1' }),
        artists: [artistBuilder({ id: 'artist-1', name: 'Artist 1' })],
        album: albumBuilder({ id: 'album-1', name: 'Album 1' }),
        genres: [],
      };

      const mockHistoryItems = [
        {
          id: 'lh-1',
          userId: 'user-123',
          trackId: 'track-1',
          listenedAt: new Date(),
          durationMs: 120000,
          completed: true,
          track: mockTrack,
        },
      ];

      prismaMock.client.listenHistory.findMany.mockResolvedValue(mockHistoryItems);
      prismaMock.client.listenHistory.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/history')
        .query({ page: 1, limit: 10 })
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].id).toBe('lh-1');
      expect(response.body.data.items[0].track.title).toBe(mockTrack.title);
      expect(response.body.data.total).toBe(1);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).get('/history').expect(401);
    });
  });

  describe('DELETE /history', () => {
    it('should clear user listening history successfully (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.listenHistory.updateMany.mockResolvedValue({ count: 5 });

      const response = await request(app.getHttpServer())
        .delete('/history')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.success).toBe(true);
      expect(prismaMock.client.listenHistory.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).delete('/history').expect(401);
    });
  });
});
