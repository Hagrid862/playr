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
    deleteFile = vi.fn().mockResolvedValue(undefined);
  },
}));

const mockArtistBase = {
  id: 'artist-123',
  name: 'Test Artist',
  description: 'A test artist',
  isCommunity: false,
  verified: false,
  bannerId: null,
  avatarId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  avatar: null,
  banner: null,
};

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

  // ─────────────────────────────────────────────────────────────
  // POST /artists (Create Artist)
  // ─────────────────────────────────────────────────────────────

  describe('POST /artists', () => {
    it('should create an artist successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      // No existing artist with same name
      prismaMock.client.artist.findFirst.mockResolvedValue(null);

      prismaMock.client.artist.create.mockResolvedValue({
        ...mockArtistBase,
        id: 'new-artist',
        name: 'New Artist',
        description: 'A brand new artist',
      } as any);

      prismaMock.client.libraryArtist.create.mockResolvedValue({
        id: 'la-1',
        libraryId: 'lib-123',
        artistId: 'new-artist',
      } as any);

      prismaMock.mainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(prismaMock.client);
      });

      const response = await request(app.getHttpServer())
        .post('/artists')
        .set('Authorization', authHeader)
        .send({ name: 'New Artist', description: 'A brand new artist' })
        .expect(201);

      expect(response.body.data.name).toBe('New Artist');
    });

    it('should return 409 if artist name is already taken', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      // Artist with same name already exists
      prismaMock.client.artist.findFirst.mockResolvedValue({
        ...mockArtistBase,
        name: 'Existing Artist',
      } as any);

      prismaMock.mainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(prismaMock.client);
      });

      await request(app.getHttpServer())
        .post('/artists')
        .set('Authorization', authHeader)
        .send({ name: 'Existing Artist' })
        .expect(409);
    });

    it('should return 412 if user private profile not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue(null);
      prismaMock.client.library.findUnique.mockResolvedValue({
        id: 'lib-123',
        userId: 'user-123',
      } as any);

      await request(app.getHttpServer())
        .post('/artists')
        .set('Authorization', authHeader)
        .send({ name: 'New Artist' })
        .expect(412);
    });

    it('should return 412 if user library not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.library.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/artists')
        .set('Authorization', authHeader)
        .send({ name: 'New Artist' })
        .expect(412);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).post('/artists').send({ name: 'New Artist' }).expect(401);
    });

    it('should return 400 if name is missing', async () => {
      const authHeader = await getAuthHeader();

      await request(app.getHttpServer())
        .post('/artists')
        .set('Authorization', authHeader)
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GET /artists/private (Get Private Artists)
  // ─────────────────────────────────────────────────────────────

  describe('GET /artists/private', () => {
    it('should return private artists (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.artist.findMany.mockResolvedValue([
        { ...mockArtistBase, id: 'artist-1', name: 'Artist One' },
        { ...mockArtistBase, id: 'artist-2', name: 'Artist Two' },
      ] as any);

      const response = await request(app.getHttpServer())
        .get('/artists/private')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Artist One');
      expect(response.body.data[1].name).toBe('Artist Two');
    });

    it('should return empty array when no private artists (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.artist.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/artists/private')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).get('/artists/private').expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PATCH /artists/:id (Update Artist)
  // ─────────────────────────────────────────────────────────────

  describe('PATCH /artists/:id', () => {
    it('should update artist name successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      // Artist exists and is owned by this user
      prismaMock.client.artist.findFirst.mockResolvedValueOnce({
        ...mockArtistBase,
        id: artistId,
      } as any);

      // No other artist with same name
      prismaMock.client.artist.findFirst.mockResolvedValueOnce(null);

      prismaMock.client.artist.update.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
        name: 'Updated Name',
      } as any);

      const response = await request(app.getHttpServer())
        .patch(`/artists/${artistId}`)
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should update artist description successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.artist.findFirst.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
      } as any);

      prismaMock.client.artist.update.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
        description: 'New description',
      } as any);

      const response = await request(app.getHttpServer())
        .patch(`/artists/${artistId}`)
        .set('Authorization', authHeader)
        .send({ description: 'New description' })
        .expect(200);

      expect(response.body.data.description).toBe('New description');
    });

    it('should return 404 if artist not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      // Artist not found
      prismaMock.client.artist.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/artists/nonexistent')
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should return 409 if new name is already taken', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      // Artist being updated
      prismaMock.client.artist.findFirst.mockResolvedValueOnce({
        ...mockArtistBase,
        id: artistId,
        name: 'Original Name',
      } as any);

      // Another artist already has the desired name
      prismaMock.client.artist.findFirst.mockResolvedValueOnce({
        ...mockArtistBase,
        id: 'other-artist',
        name: 'Taken Name',
      } as any);

      await request(app.getHttpServer())
        .patch(`/artists/${artistId}`)
        .set('Authorization', authHeader)
        .send({ name: 'Taken Name' })
        .expect(409);
    });

    it('should return 412 if user private profile not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/artists/artist-123')
        .set('Authorization', authHeader)
        .send({ name: 'Updated' })
        .expect(412);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer())
        .patch('/artists/artist-123')
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /artists/:id (Delete Artist — soft delete)
  // ─────────────────────────────────────────────────────────────

  describe('DELETE /artists/:id', () => {
    it('should soft-delete an artist successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.artist.findFirst.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
      } as any);

      const deletedAt = new Date();
      prismaMock.client.artist.update.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
        deletedAt,
      } as any);

      const response = await request(app.getHttpServer())
        .delete(`/artists/${artistId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(artistId);
      expect(response.body.data.deletedAt).toBeTruthy();
    });

    it('should return 404 if artist not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.artist.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/artists/nonexistent')
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 412 if user private profile not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/artists/artist-123')
        .set('Authorization', authHeader)
        .expect(412);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).delete('/artists/artist-123').expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /artists/:id/avatar (Upload Avatar)
  // ─────────────────────────────────────────────────────────────

  describe('POST /artists/:id/avatar', () => {
    it('should upload artist avatar successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.artist.findFirst.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
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
        ...mockArtistBase,
        id: artistId,
        avatarId: 'img-123',
      } as any);

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

  // ─────────────────────────────────────────────────────────────
  // POST /artists/:id/banner (Upload Banner)
  // ─────────────────────────────────────────────────────────────

  describe('POST /artists/:id/banner', () => {
    it('should upload artist banner successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const artistId = 'artist-123';

      prismaMock.client.userPrivateProfile.findUnique.mockResolvedValue({
        id: 'pp-123',
        userId: 'user-123',
      } as any);

      prismaMock.client.artist.findFirst.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
      } as any);

      prismaMock.client.image.create.mockResolvedValue({
        id: 'img-456',
        alt: null,
        bucket: FileBucket.public,
        key: 'key',
        url: 'http://localhost/banner.webp',
        mimeType: 'image/webp',
        blurhash: null,
        reportId: null,
        uploadStatus: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      prismaMock.client.artist.update.mockResolvedValue({
        ...mockArtistBase,
        id: artistId,
        bannerId: 'img-456',
      } as any);

      prismaMock.mainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(prismaMock.client);
      });

      const validPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post(`/artists/${artistId}/banner`)
        .set('Authorization', authHeader)
        .attach('file', validPng, {
          filename: 'banner.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(response.body.data.id).toBe('img-456');
      expect(response.body.data.url).toBe('http://localhost/banner.webp');
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).post('/artists/123/banner').expect(401);
    });
  });
});
