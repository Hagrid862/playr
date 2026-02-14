import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { vi } from 'vitest';
import { ImageService } from '../src/shared/services/image.service';
import { StorageService } from '../src/shared/services/storage.service';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import './setup-env';
import { createIntegrationApp } from './test-utils';

describe('AlbumsController (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let jwtService: JwtService;
  let config: ConfigService;
  let storageServiceMock: { uploadFile: any; deleteFile: any };
  let imageServiceMock: { validateImage: any; resizeToMaxDimension: any };

  beforeAll(async () => {
    storageServiceMock = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    imageServiceMock = {
      validateImage: vi.fn(),
      resizeToMaxDimension: vi.fn(),
    };

    const setup = await createIntegrationApp((builder) => {
      return builder
        .overrideProvider(StorageService)
        .useValue(storageServiceMock)
        .overrideProvider(ImageService)
        .useValue(imageServiceMock);
    });

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

  const mockAlbum = {
    id: 'album-123',
    name: 'Test Album',
    description: 'Test Description',
    type: 'album',
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: 'PUBLIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    artists: [],
    genres: [],
    tracks: [],
    access: [
      {
        userId: 'user-123',
        role: 'owner',
      },
    ],
  };

  describe('DELETE /albums/:id', () => {
    it('should delete an album successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const albumId = 'album-123';

      // Mock finding the album (including access check)
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum as any);

      // Mock the delete (or update for soft delete)
      prismaMock.client.album.update.mockResolvedValue({
        ...mockAlbum,
        deletedAt: new Date(),
      } as any);

      // The repository method "delete" in DeleteAlbumHandler calls "update" (soft delete now)
      // Wait, let's verify DeleteAlbumHandler implementation again.
      // Yes, I implemented soft delete via albumRepository.update().

      const response = await request(app.getHttpServer())
        .delete(`/library/albums/${albumId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(albumId);
      expect(response.body.data.deletedAt).toBeDefined();
    });

    it('should return 404 if album not found', async () => {
      const authHeader = await getAuthHeader();
      const albumId = 'non-existent';

      prismaMock.client.album.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete(`/library/albums/${albumId}`)
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return 401 if unauthorized', async () => {
      await request(app.getHttpServer()).delete('/library/albums/album-123').expect(401);
    });
  });

  describe('POST /albums/:id/cover', () => {
    it('should upload album cover successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const albumId = 'album-123';
      const mockFile = Buffer.from('test-image');

      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum as any);

      imageServiceMock.validateImage.mockResolvedValue(true);
      imageServiceMock.resizeToMaxDimension.mockResolvedValue(mockFile);
      storageServiceMock.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/cover.webp',
        key: 'cover.webp',
      });

      // Transaction simulation
      prismaMock.mainClient.$transaction.mockImplementation(async (cb: any) =>
        cb(prismaMock.client),
      );

      prismaMock.client.image.create.mockResolvedValue({
        id: 'img-123',
        alt: null,
        bucket: 'public',
        key: 'cover.webp',
        url: 'https://cdn.example.com/cover.webp',
        mimeType: 'image/webp',
        blurhash: null,
        reportId: null,
        uploadStatus: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      prismaMock.client.album.update.mockResolvedValue({
        ...mockAlbum,
        coverId: 'img-123',
      } as any);

      const response = await request(app.getHttpServer())
        .post(`/library/albums/${albumId}/cover`)
        .set('Authorization', authHeader)
        .attach('file', mockFile, 'cover.png')
        .expect(201);

      expect(response.body.data.id).toBe('img-123');
      expect(response.body.data.url).toBe('https://cdn.example.com/cover.webp');
    });

    it('should return 400 if image validation fails', async () => {
      const authHeader = await getAuthHeader();
      const albumId = 'album-123';
      const mockFile = Buffer.from('invalid-image');

      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum as any);
      imageServiceMock.validateImage.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post(`/library/albums/${albumId}/cover`)
        .set('Authorization', authHeader)
        .attach('file', mockFile, 'cover.txt')
        .expect(400);
    });
  });
});
