import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Library, LibraryTrack, PrismaClient, TrackGetPayload } from '@repo/db';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaServiceMock } from './mocks/prisma.service.mock';
import './setup-env';
import { createIntegrationApp } from './test-utils';

type TrackWithRelations = TrackGetPayload<{
  include: { artists: true; album: true; access: true };
}>;

type LibraryTrackWithRelations = LibraryTrack & {
  track: TrackWithRelations;
};

describe('LibraryTracksController (Integration)', () => {
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

  const mockLibrary: Library = {
    id: 'library-123',
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTrack: TrackWithRelations = {
    id: 'track-123',
    title: 'Test Track',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    visibility: 'private',
    albumId: 'album-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    album: {
      id: 'album-123',
      name: 'Test Album',
      description: 'Test Description',
      type: 'album',
      totalTracks: 10,
      totalDuration: 3000,
      releaseDate: new Date(),
      coverId: null,
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as any,
    artists: [
      {
        id: 'artist-123',
        name: 'Test Artist',
        description: 'Test Description',
        isCommunity: false,
        verified: true,
        bannerId: null,
        avatarId: null,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any,
    ],
    access: [
      {
        id: 'access-123',
        userId: 'user-123',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
        trackId: 'track-123',
      },
    ],
  };

  const mockLibraryTrack: LibraryTrackWithRelations = {
    id: 'lib-track-123',
    libraryId: 'library-123',
    trackId: 'track-123',
    listenedCount: 0,
    listenCountResetAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    track: mockTrack,
  };

  describe('POST /library/tracks', () => {
    it('should create a track successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user-123' } as any);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(mockTrack.album);
      prismaMock.client.track.create.mockResolvedValue(mockTrack);
      prismaMock.client.libraryTrack.create.mockResolvedValue(mockLibraryTrack);

      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .post('/library/tracks')
        .set('Authorization', authHeader)
        .send({
          title: 'Test Track',
          albumId: 'album-123',
          trackNumber: 1,
          diskNumber: 1,
          duration: 180,
          explicit: false,
          visibility: 'private',
          artistIds: ['artist-123'],
        });

      if (response.status !== 201) {
        console.log('POST /library/tracks error:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);

      expect(response.body.data.id).toBe(mockTrack.id);
      expect(response.body.data.title).toBe(mockTrack.title);
    });
  });

  describe('GET /library/tracks', () => {
    it('should return a list of tracks (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user-123' } as any);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack] as any);
      prismaMock.client.libraryTrack.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/library/tracks')
        .set('Authorization', authHeader)

        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].id).toBe(mockTrack.id);
      expect(response.body.data.total).toBe(1);
    });
  });

  describe('GET /library/tracks/:id', () => {
    it('should return a track by id (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user-123' } as any);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);

      const response = await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}`)
        .set('Authorization', authHeader)

        .expect(200);

      expect(response.body.data.id).toBe(mockTrack.id);
    });
  });

  describe('PATCH /library/tracks/:id', () => {
    it('should update a track successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const updatedTrack = { ...mockTrack, title: 'Updated Title' };

      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user-123' } as any);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);
      prismaMock.client.track.update.mockResolvedValue(updatedTrack);

      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .patch(`/library/tracks/${mockTrack.id}`)
        .set('Authorization', authHeader)

        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.data.title).toBe('Updated Title');
    });
  });

  describe('DELETE /library/tracks/:id', () => {
    it('should delete a track successfully (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user-123' } as any);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);
      prismaMock.client.track.update.mockResolvedValue({
        ...mockTrack,
        deletedAt: new Date(),
      });
      prismaMock.client.libraryTrack.deleteMany.mockResolvedValue({ count: 1 });

      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .delete(`/library/tracks/${mockTrack.id}`)
        .set('Authorization', authHeader)

        .expect(200);

      expect(response.body.data).toEqual(JSON.parse(JSON.stringify(mockTrack)));
    });
  });

  describe('GET /library/tracks/:id/qualities', () => {
    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/qualities`)
        .expect(401);
    });
  });

  describe('POST /library/tracks/:id/audio', () => {
    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer()).post(`/library/tracks/${mockTrack.id}/audio`).expect(401);
    });
  });

  describe('GET /library/tracks/:id/stream', () => {
    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer()).get(`/library/tracks/${mockTrack.id}/stream`).expect(401);
    });
  });
});
