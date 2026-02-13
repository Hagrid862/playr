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

  describe('GET /library/artists', () => {
    it('should return paginated library artists (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      const mockArtists = [
        {
          id: 'la-1',
          libraryId: 'lib-123',
          artistId: 'artist-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          artist: {
            id: 'artist-1',
            name: 'Artist One',
            avatar: null,
            banner: null,
          },
        },
        {
          id: 'la-2',
          libraryId: 'lib-123',
          artistId: 'artist-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          artist: {
            id: 'artist-2',
            name: 'Artist Two',
            avatar: null,
            banner: null,
          },
        },
      ];

      prismaMock.client.libraryArtist.findMany.mockResolvedValue(mockArtists as any);
      prismaMock.client.libraryArtist.count.mockResolvedValue(2);

      const response = await request(app.getHttpServer())
        .get('/library/artists')
        .query({ page: 1, limit: 10 })
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should return empty list when no artists in library (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.libraryArtist.findMany.mockResolvedValue([]);
      prismaMock.client.libraryArtist.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/library/artists')
        .query({ page: 1, limit: 10 })
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 412 if user library not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/artists')
        .query({ page: 1, limit: 10 })
        .set('Authorization', authHeader)
        .expect(412);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).get('/library/artists').expect(401);
    });
  });

  describe('GET /library/artists/:id', () => {
    it('should return a single library artist (200)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-1';

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.libraryArtist.findUnique.mockResolvedValue({
        id: 'la-1',
        libraryId: 'lib-123',
        artistId,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: {
          id: artistId,
          name: 'Artist One',
          avatar: null,
          banner: null,
        },
      } as any);

      const response = await request(app.getHttpServer())
        .get(`/library/artists/${artistId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.artistId).toBe(artistId);
      expect(response.body.data.artist.name).toBe('Artist One');
    });

    it('should return 404 if artist not found in library', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.libraryArtist.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/artists/nonexistent-artist')
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 412 if user library not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/artists/artist-1')
        .set('Authorization', authHeader)
        .expect(412);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).get('/library/artists/artist-1').expect(401);
    });
  });
});
