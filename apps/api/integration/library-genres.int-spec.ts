import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Genre, GenreKind, Library } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';
import './setup-env';

function mockGenre(overrides: Partial<Genre> = {}): Genre {
  return {
    id: 'genre-123',
    name: 'Rock',
    slug: 'rock',
    kind: GenreKind.custom,
    description: null,
    libraryId: 'library-123',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LibraryGenresController (Integration)', () => {
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

  const mockLibrary: Library = libraryBuilder({
    id: 'library-123',
    userId: 'user-123',
  });

  describe('POST /library/genres', () => {
    it('should create a custom genre successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const genre = mockGenre({ name: 'Jazz', slug: 'jazz' });

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      // No existing custom genre
      prismaMock.client.genre.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prismaMock.client.genre.create.mockResolvedValue(genre);

      const response = await request(app.getHttpServer())
        .post('/library/genres')
        .set('Authorization', authHeader)
        .send({ name: 'Jazz' })
        .expect(201);

      expect(response.body.data.id).toBe(genre.id);
      expect(response.body.data.name).toBe('Jazz');
    });

    it('should return 412 if user library not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/library/genres')
        .set('Authorization', authHeader)
        .send({ name: 'Jazz' })
        .expect(412);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).post('/library/genres').send({ name: 'Jazz' }).expect(401);
    });
  });

  describe('GET /library/genres', () => {
    it('should return paginated genres (200)', async () => {
      const authHeader = await getAuthHeader();
      const genres = [
        mockGenre({
          id: 'g1',
          name: 'Rock',
          slug: 'rock',
          kind: GenreKind.system,
          libraryId: null,
        }),
        mockGenre({ id: 'g2', name: 'Jazz', slug: 'jazz' }),
      ];

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.genre.findMany.mockResolvedValue(genres);
      prismaMock.client.genre.count.mockResolvedValue(2);

      const response = await request(app.getHttpServer())
        .get('/library/genres')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });
  });

  describe('GET /library/genres/:id', () => {
    it('should return a genre by id (200)', async () => {
      const authHeader = await getAuthHeader();
      const genre = mockGenre();

      prismaMock.client.genre.findFirst.mockResolvedValue(genre);

      const response = await request(app.getHttpServer())
        .get(`/library/genres/${genre.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(genre.id);
      expect(response.body.data.name).toBe(genre.name);
    });

    it('should return 404 if genre not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.genre.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/genres/non-existent')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('PATCH /library/genres/:id', () => {
    it('should update custom genre successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const genre = mockGenre();
      const updatedGenre = mockGenre({ name: 'Modern Rock' });

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.genre.findUnique.mockResolvedValue(genre);
      // No collision on rename
      prismaMock.client.genre.findFirst.mockResolvedValue(null);
      prismaMock.client.genre.update.mockResolvedValue(updatedGenre);

      const response = await request(app.getHttpServer())
        .patch(`/library/genres/${genre.id}`)
        .set('Authorization', authHeader)
        .send({ name: 'Modern Rock' })
        .expect(200);

      expect(response.body.data.name).toBe('Modern Rock');
    });

    it('should return 403 when updating a system genre', async () => {
      const authHeader = await getAuthHeader();
      const systemGenre = mockGenre({ kind: GenreKind.system, libraryId: null });

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.genre.findUnique.mockResolvedValue(systemGenre);

      await request(app.getHttpServer())
        .patch(`/library/genres/${systemGenre.id}`)
        .set('Authorization', authHeader)
        .send({ name: 'System Rock' })
        .expect(403);
    });
  });

  describe('DELETE /library/genres/:id', () => {
    it('should delete custom genre successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const genre = mockGenre();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.genre.findUnique.mockResolvedValue(genre);
      prismaMock.client.genre.update.mockResolvedValue({
        ...genre,
        deletedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .delete(`/library/genres/${genre.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(genre.id);
    });

    it('should return 403 when deleting a system genre', async () => {
      const authHeader = await getAuthHeader();
      const systemGenre = mockGenre({ kind: GenreKind.system, libraryId: null });

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.genre.findUnique.mockResolvedValue(systemGenre);

      await request(app.getHttpServer())
        .delete(`/library/genres/${systemGenre.id}`)
        .set('Authorization', authHeader)
        .expect(403);
    });
  });
});
