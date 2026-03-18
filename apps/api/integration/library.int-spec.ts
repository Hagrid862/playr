import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ArtistGetPayload, Library, LibraryArtistGetPayload } from '@repo/db';
import { artistBuilder, libraryArtistBuilder, libraryBuilder } from '@repo/testing';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import { createIntegrationApp } from './test-utils';

type ArtistWithRelations = ArtistGetPayload<{
  include: { avatar: true; banner: true };
}>;

type LibraryArtistWithRelations = LibraryArtistGetPayload<{
  include: { artist: { include: { avatar: true; banner: true } } };
}>;

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

  const mockLibrary: Library = libraryBuilder({
    id: 'lib-123',
    userId: 'user-123',
  });

  const mockArtist: ArtistWithRelations = {
    ...artistBuilder({
      id: 'artist-1',
      name: 'Artist One',
    }),
    avatar: null,
    banner: null,
  };

  const mockLibraryArtist: LibraryArtistWithRelations = {
    ...libraryArtistBuilder({
      id: 'library-artist-1',
      libraryId: 'lib-123',
      artistId: 'artist-1',
    }),
    artist: mockArtist,
  };

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
      prismaMock.client.library.create.mockResolvedValue(mockLibrary);

      const response = await request(app.getHttpServer())
        .post('/library')
        .set('Authorization', authHeader)
        .expect(201);

      expect(response.body.data.userId).toBe('user-123');
    });

    it('should return 409 if library already exists', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

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

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

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

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

      const mockArtists: LibraryArtistWithRelations[] = [
        {
          ...libraryArtistBuilder({
            libraryId: 'lib-123',
            artistId: 'artist-1',
          }),
          artist: mockArtist,
        },
        {
          ...libraryArtistBuilder({
            libraryId: 'lib-123',
            artistId: 'artist-2',
          }),
          artist: {
            ...artistBuilder({ id: 'artist-2', name: 'Artist Two' }),
            avatar: null,
            banner: null,
          },
        },
      ];

      prismaMock.client.libraryArtist.findMany.mockResolvedValue(mockArtists);
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

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

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

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

      prismaMock.client.libraryArtist.findFirst.mockResolvedValue(mockLibraryArtist);

      const response = await request(app.getHttpServer())
        .get(`/library/artists/${artistId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.artistId).toBe(artistId);
      expect(response.body.data.artist.name).toBe('Artist One');
    });

    it('should return 404 if artist not found in library', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

      prismaMock.client.libraryArtist.findFirst.mockResolvedValue(null);

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
