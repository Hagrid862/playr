import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import './setup-env';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';

describe('SearchController (Integration)', () => {
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
    // Add extended property to mock for search service
    (prismaMock as any).extended = {
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
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

  describe('GET /search/suggestions', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/search/suggestions')
        .query({ query: 'test' })
        .expect(401);
    });

    it('should return 400 when query is too short', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'ab' })
        .expect(400);
    });

    it('should return 400 when query is empty', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .query({ query: '' })
        .expect(400);
    });

    it('should return 400 when query parameter is missing', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .expect(400);
    });

    it('should return search results for valid query with authenticated user', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      // Mock the extended prisma client for search
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Test Artist',
          type: 'artist',
          visibility: 'public',
          albumType: null,
          score: 0.8,
        },
      ];

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce(mockResults);

      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array when no results found', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'nonexistent' })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should handle query with special characters', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test-query' })
        .expect(200);
    });

    it('should handle query with leading/trailing whitespace', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/suggestions')
        .set('Authorization', authHeader)
        .query({ query: '  test  ' })
        .expect(200);
    });
  });

  describe('GET /search/library-suggestions', () => {
    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .query({ query: 'test' })
        .expect(401);
    });

    it('should return 400 when query is too short', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'ab' })
        .expect(400);
    });

    it('should return 400 when query is empty', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: '' })
        .expect(400);
    });

    it('should return 400 when query parameter is missing', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .expect(400);
    });

    it('should return library search results for valid query with authenticated user', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      const mockResults = [
        {
          id: 'artist-1',
          name: 'Library Artist',
          type: 'artist',
          visibility: 'private',
          albumType: null,
          score: 0.9,
        },
      ];

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce(mockResults);

      const response = await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array when no results found', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'nonexistent' })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should filter by single category', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test', categories: 'artist' })
        .expect(200);
    });

    it('should filter by multiple categories', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test', categories: ['artist', 'album', 'track'] })
        .expect(200);
    });

    it('should handle all category types', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test', categories: ['artist', 'album', 'track', 'playlist', 'genre'] })
        .expect(200);
    });

    it('should handle query with special characters', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'test-query' })
        .expect(200);
    });

    it('should handle query with leading/trailing whitespace', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: '  test  ' })
        .expect(200);
    });

    it('should return results with albumType when present', async () => {
      const authHeader = await getAuthHeader();

      setupJwtAuthPrismaMocks(prismaMock);

      const mockResults = [
        {
          id: 'album-1',
          name: 'Test Album',
          type: 'album',
          visibility: 'private',
          albumType: 'album',
          score: 0.7,
        },
      ];

      (prismaMock as any).extended.$queryRaw.mockResolvedValueOnce(mockResults);

      const response = await request(app.getHttpServer())
        .get('/search/library-suggestions')
        .set('Authorization', authHeader)
        .query({ query: 'album' })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});
