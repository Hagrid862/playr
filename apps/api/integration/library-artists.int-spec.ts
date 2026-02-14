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
import {
  ArtistGetPayload,
  Image,
  Library,
  LibraryAlbum,
  LibraryArtist,
  PrismaClient,
} from '@repo/db';

// Helper type for Artist with relations matching repository include
type ArtistWithRelations = ArtistGetPayload<{
  include: { avatar: true; banner: true };
}>;

// Helper type for LibraryArtist with relations matching repository include
type LibraryArtistWithRelations = LibraryArtist & {
  artist: ArtistWithRelations;
};

describe('LibraryArtistsController (Integration)', () => {
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

  const mockLibrary: Library = {
    id: 'library-123',
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockArtist: ArtistWithRelations = {
    id: 'artist-123',
    name: 'Test Artist',
    description: 'Test Description',
    isCommunity: false,
    verified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    avatarId: null,
    bannerId: null,
    visibility: 'private',
    avatar: null,
    banner: null,
  };

  const mockLibraryArtist: LibraryArtistWithRelations = {
    id: 'lib-artist-123',
    libraryId: 'library-123',
    artistId: 'artist-123',
    artist: mockArtist,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockImage: Image = {
    id: 'img-123',
    alt: null,
    bucket: 'public',
    key: 'test-key.webp',
    url: 'https://cdn.example.com/test.webp',
    mimeType: 'image/webp',
    blurhash: null,
    reportId: null,
    uploadStatus: 'uploaded',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  describe('POST /library/artists', () => {
    it('should create an artist successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.artist.findFirst.mockResolvedValue(null); // No conflict
      prismaMock.client.artist.create.mockResolvedValue(mockArtist);
      prismaMock.client.libraryArtist.create.mockResolvedValue(mockLibraryArtist);

      const response = await request(app.getHttpServer())
        .post('/library/artists')
        .set('Authorization', authHeader)
        .send({
          name: 'Test Artist',
          description: 'Test Description',
        })
        .expect(201);

      expect(response.body.data.id).toBe(mockArtist.id);
      expect(response.body.data.name).toBe(mockArtist.name);
    });

    it('should return 409 if artist name already exists for user', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.artist.findFirst.mockResolvedValue(mockArtist); // Conflict

      await request(app.getHttpServer())
        .post('/library/artists')
        .set('Authorization', authHeader)
        .send({
          name: 'Test Artist',
        })
        .expect(409);
    });

    it('should return 400 for invalid input', async () => {
      const authHeader = await getAuthHeader();

      await request(app.getHttpServer())
        .post('/library/artists')
        .set('Authorization', authHeader)
        .send({
          // Missing name
          description: 'Test Description',
        })
        .expect(400);
    });
  });

  describe('GET /library/artists', () => {
    it('should return a list of artists (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.libraryArtist.findMany.mockResolvedValue([
        mockLibraryArtist,
      ] as unknown as LibraryArtist[]);
      prismaMock.client.libraryArtist.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/library/artists')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].artist.id).toBe(mockArtist.id);
      expect(response.body.data.total).toBe(1);
    });

    it('should handle pagination', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.libraryArtist.findMany.mockResolvedValue([]);
      prismaMock.client.libraryArtist.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/library/artists?page=2&limit=5')
        .set('Authorization', authHeader)
        .expect(200);

      expect(prismaMock.client.libraryArtist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('GET /library/artists/:id', () => {
    it('should return an artist by id (200)', async () => {
      const authHeader = await getAuthHeader();

      // GetLibraryArtistHandler uses libraryArtistRepository.findOne
      // mock as unknown as LibraryArtist because findFirst returns LibraryArtist but we return LibraryArtistWithRelations
      prismaMock.client.libraryArtist.findFirst.mockResolvedValue(
        mockLibraryArtist as unknown as LibraryArtist,
      );

      const response = await request(app.getHttpServer())
        .get(`/library/artists/${mockArtist.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.artist.id).toBe(mockArtist.id);
    });

    it('should return 404 if artist not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.libraryArtist.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/artists/non-existent')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('PATCH /library/artists/:id', () => {
    it('should update an artist successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const updatedArtist: ArtistWithRelations = { ...mockArtist, name: 'Updated Name' };

      // Reset mocks specific to this test to ensure clean state
      prismaMock.client.artist.findFirst.mockReset();
      prismaMock.client.artist.findUnique.mockReset();

      // If findUnique is used for retrieval
      prismaMock.client.artist.findUnique.mockResolvedValue(mockArtist);

      // If findFirst is used (first for retrieval, second for conflict check)
      prismaMock.client.artist.findFirst
        .mockResolvedValueOnce(mockArtist) // 1. Retrieve artist (if findFirst used)
        .mockResolvedValueOnce(null); // 2. Check conflict (must return null)

      prismaMock.client.artist.update.mockResolvedValue(updatedArtist);

      const response = await request(app.getHttpServer())
        .patch(`/library/artists/${mockArtist.id}`)
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 404 if artist to update not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.artist.findUnique.mockResolvedValue(null);
      prismaMock.client.artist.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/library/artists/non-existent')
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /library/artists/:id', () => {
    it('should delete an artist successfully (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.artist.findFirst.mockResolvedValue(mockArtist);
      prismaMock.client.artist.findUnique.mockResolvedValue(mockArtist);

      prismaMock.client.artist.delete.mockResolvedValue(mockArtist);

      const response = await request(app.getHttpServer())
        .delete(`/library/artists/${mockArtist.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should return 404 if artist to delete not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.artist.findFirst.mockResolvedValue(null);
      prismaMock.client.artist.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/library/artists/non-existent')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('GET /library/artists/:id/albums', () => {
    it('should return artist albums (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

      const mockLibraryAlbum = {
        id: 'lib-album-1',
        libraryId: 'library-123',
        albumId: 'album-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        album: {
          id: 'album-1',
          name: 'Album 1',
          type: 'album',
          artists: [mockArtist],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          coverId: null,
          releaseDate: new Date(),
          description: null,
          totalTracks: 0,
          totalDuration: 0,
          visibility: 'public',
        },
      };

      prismaMock.client.libraryArtist.findFirst.mockResolvedValue(
        mockLibraryArtist as unknown as LibraryArtist,
      );
      prismaMock.client.libraryArtist.findUnique.mockResolvedValue(
        mockLibraryArtist as unknown as LibraryArtist,
      );
      prismaMock.client.libraryAlbum.findMany.mockResolvedValue([
        mockLibraryAlbum,
      ] as unknown as LibraryAlbum[]);
      prismaMock.client.libraryAlbum.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/library/artists/${mockArtist.id}/albums`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.total).toBe(1);
    });
  });

  describe('POST /library/artists/:id/avatar', () => {
    it('should upload avatar successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const mockFile = Buffer.from('test-image');

      prismaMock.client.artist.findFirst.mockResolvedValue(mockArtist);
      prismaMock.client.artist.findUnique.mockResolvedValue(mockArtist);
      imageServiceMock.validateImage.mockResolvedValue(true);
      imageServiceMock.resizeToMaxDimension.mockResolvedValue(mockFile);
      storageServiceMock.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/avatar.webp',
        key: 'avatar.webp',
      });

      // Transaction mock
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const mockAvatarImage: Image = {
        ...mockImage,
        id: 'img-avatar',
        key: 'avatar.webp',
        url: 'https://cdn.example.com/avatar.webp',
      };

      prismaMock.client.image.create.mockResolvedValue(mockAvatarImage);

      prismaMock.client.artist.update.mockResolvedValue({
        ...mockArtist,
        avatarId: 'img-avatar',
      });

      const response = await request(app.getHttpServer())
        .post(`/library/artists/${mockArtist.id}/avatar`)
        .set('Authorization', authHeader)
        .attach('file', mockFile, 'avatar.png')
        .expect(201);

      expect(response.body.data.id).toBe('img-avatar');
    });
  });

  describe('POST /library/artists/:id/banner', () => {
    it('should upload banner successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const mockFile = Buffer.from('test-image');

      prismaMock.client.artist.findFirst.mockResolvedValue(mockArtist);
      prismaMock.client.artist.findUnique.mockResolvedValue(mockArtist);
      imageServiceMock.validateImage.mockResolvedValue(true);
      imageServiceMock.resizeToMaxDimension.mockResolvedValue(mockFile);
      storageServiceMock.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/banner.webp',
        key: 'banner.webp',
      });

      // Transaction mock
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const mockBannerImage: Image = {
        ...mockImage,
        id: 'img-banner',
        key: 'banner.webp',
        url: 'https://cdn.example.com/banner.webp',
      };

      prismaMock.client.image.create.mockResolvedValue(mockBannerImage);

      prismaMock.client.artist.update.mockResolvedValue({
        ...mockArtist,
        bannerId: 'img-banner',
      });

      const response = await request(app.getHttpServer())
        .post(`/library/artists/${mockArtist.id}/banner`)
        .set('Authorization', authHeader)
        .attach('file', mockFile, 'banner.png')
        .expect(201);

      expect(response.body.data.id).toBe('img-banner');
    });
  });
});
