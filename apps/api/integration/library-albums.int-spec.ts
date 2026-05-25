import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccessRole,
  AlbumGetPayload,
  AlbumSystemKind,
  Image,
  Library,
  LibraryAlbumGetPayload,
  LibraryTrackGetPayload,
  PrismaClient,
  Track,
  TrackGetPayload,
  User,
} from '@repo/db';
import {
  albumAccessBuilder,
  albumBuilder,
  artistBuilder,
  audioFileBuilder,
  imageBuilder,
  libraryAlbumBuilder,
  libraryBuilder,
  libraryTrackBuilder,
  trackAccessBuilder,
  trackBuilder,
  userBuilder,
} from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import { ImageService } from '../src/shared/services/image.service';
import { StorageService } from '../src/shared/services/storage.service';
import './setup-env';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';

type AlbumWithRelations = AlbumGetPayload<{
  include: { artists: true; genres: true; tracks: true; access: true; cover: true };
}>;

type LibraryAlbumWithRelations = LibraryAlbumGetPayload<{
  include: {
    album: { include: { artists: true; genres: true; tracks: true; access: true; cover: true } };
  };
}>;

type LibraryTrackWithRelations = LibraryTrackGetPayload<{
  include: { track: { include: { artists: true; album: true; access: true } } };
}>;

describe('LibraryAlbumsController (Integration)', () => {
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

  const mockAlbum: AlbumWithRelations = {
    ...albumBuilder({
      id: 'album-123',
      libraryId: null,
      systemKind: AlbumSystemKind.none,
    }),
    artists: [artistBuilder()],
    genres: [],
    tracks: [],
    access: [
      albumAccessBuilder({
        id: 'access-123',
        userId: 'user-123',
        albumId: 'album-123',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ],
    cover: null,
  };

  const mockLibraryAlbum: LibraryAlbumWithRelations = {
    ...libraryAlbumBuilder({
      id: 'lib-album-123',
      libraryId: 'library-123',
      albumId: 'album-123',
    }),
    album: mockAlbum,
  };

  const mockImage: Image = imageBuilder({
    id: 'img-123',
  });

  const mockUser: User = userBuilder({
    id: 'user-123',
  });

  describe('POST /library/albums', () => {
    it('should create an album successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(null); // No conflict
      prismaMock.client.artist.count.mockResolvedValue(1);
      // create returns Album (without relations by default), but we can mock it returning our full object
      prismaMock.client.album.create.mockResolvedValue(mockAlbum);
      prismaMock.client.libraryAlbum.create.mockResolvedValue(mockLibraryAlbum);

      // UnitOfWork transaction mock
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .post('/library/albums')
        .set('Authorization', authHeader)
        .send({
          name: 'Test Album',
          description: 'Test Description',
          type: 'album',
          releaseDate: new Date().toISOString(),
          artistIds: ['artist-123'],
        })
        .expect(201);

      expect(response.body.data.id).toBe(mockAlbum.id);
      expect(response.body.data.name).toBe(mockAlbum.name);
    });

    it('should return 409 if album name already exists for user', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum); // Conflict
      prismaMock.client.artist.count.mockResolvedValue(1);

      // UnitOfWork transaction mock
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      await request(app.getHttpServer())
        .post('/library/albums')
        .set('Authorization', authHeader)
        .send({
          name: 'Test Album',
          description: 'Test Description',
          type: 'album',
          releaseDate: new Date().toISOString(),
          artistIds: ['artist-123'],
        })
        .expect(409);
    });

    it('should return 400 for invalid input', async () => {
      const authHeader = await getAuthHeader();

      await request(app.getHttpServer())
        .post('/library/albums')
        .set('Authorization', authHeader)
        .send({
          // Missing required fields
          description: 'Test Description',
        })
        .expect(400);
    });
  });

  describe('GET /library/albums', () => {
    it('should return a list of albums (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);
      prismaMock.client.libraryAlbum.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/library/albums')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].album.id).toBe(mockAlbum.id);
      expect(response.body.data.total).toBe(1);
    });

    it('should handle pagination', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);

      prismaMock.client.libraryAlbum.findMany.mockResolvedValue([]);
      prismaMock.client.libraryAlbum.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/library/albums?page=2&limit=5')
        .set('Authorization', authHeader)
        .expect(200);

      expect(prismaMock.client.libraryAlbum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('GET /library/albums/:id', () => {
    it('should return an album by id (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findUnique.mockResolvedValue(mockAlbum);

      const response = await request(app.getHttpServer())
        .get(`/library/albums/${mockAlbum.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(mockAlbum.id);
    });

    it('should return 404 if album not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findUnique.mockResolvedValue(null);
      // Mock count for AlbumAccessGuard.exists() check
      prismaMock.client.album.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/library/albums/non-existent')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('PATCH /library/albums/:id', () => {
    it('should update an album successfully (200)', async () => {
      const authHeader = await getAuthHeader();
      const updatedAlbum: AlbumWithRelations = { ...mockAlbum, name: 'Updated Name' };

      // getByIdForOwner, then getByNameForOwner (no name collision)
      prismaMock.client.album.findFirst
        .mockResolvedValueOnce(mockAlbum)
        .mockResolvedValueOnce(null);

      prismaMock.client.album.update.mockResolvedValue(updatedAlbum);

      // UnitOfWork transaction mock
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .patch(`/library/albums/${mockAlbum.id}`)
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 404 if album to update not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findUnique.mockResolvedValue(null);
      prismaMock.client.album.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/library/albums/non-existent')
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /library/albums/:id', () => {
    it('should delete an album successfully (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<unknown>) => cb(prismaMock.client),
      );
      prismaMock.client.album.findUnique.mockResolvedValue({
        coverId: null,
        deletedAt: null,
      } as any);
      prismaMock.client.reportTarget.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.libraryAlbum.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.libraryPin.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.communityComment.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.playlistTrack.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.libraryTrack.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.libraryFavorite.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.track.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.image.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.album.update.mockResolvedValue({
        ...mockAlbum,
        deletedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .delete(`/library/albums/${mockAlbum.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(mockAlbum.id);
      expect(response.body.data.deletedAt).toBeDefined();
    });

    it('should delete with keepTracks and reassign (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findFirst
        .mockResolvedValueOnce(mockAlbum)
        .mockResolvedValueOnce({ id: 'unknown-album-id' } as any);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<unknown>) => cb(prismaMock.client),
      );
      prismaMock.client.track.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.client.reportTarget.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.libraryAlbum.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.libraryPin.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.communityComment.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.client.album.findUnique.mockResolvedValue({
        coverId: null,
        deletedAt: null,
      } as any);
      prismaMock.client.album.update.mockResolvedValue({
        ...mockAlbum,
        deletedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .delete(`/library/albums/${mockAlbum.id}`)
        .query({ keepTracks: true })
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(mockAlbum.id);
      expect(prismaMock.client.track.updateMany).toHaveBeenCalled();
    });

    it('should return 400 when keepTracks on unknown bucket album', async () => {
      const authHeader = await getAuthHeader();
      const unknownAlbum = {
        ...mockAlbum,
        systemKind: AlbumSystemKind.unknown_bucket,
      };

      prismaMock.client.album.findFirst.mockResolvedValue(unknownAlbum);

      await request(app.getHttpServer())
        .delete(`/library/albums/${mockAlbum.id}`)
        .query({ keepTracks: true })
        .set('Authorization', authHeader)
        .expect(400);
    });

    it('should return 404 if album to delete not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findUnique.mockResolvedValue(null);
      prismaMock.client.album.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/library/albums/non-existent')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });

  describe('POST /library/albums/:id/cover', () => {
    it('should upload album cover successfully (201)', async () => {
      const authHeader = await getAuthHeader();
      const mockFile = Buffer.from('test-image');

      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);
      prismaMock.client.album.findUnique.mockResolvedValue(mockAlbum);

      imageServiceMock.validateImage.mockResolvedValue(true);
      imageServiceMock.resizeToMaxDimension.mockResolvedValue(mockFile);
      storageServiceMock.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/cover.webp',
        key: 'cover.webp',
      });

      // Transaction simulation
      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const mockCoverImage: Image = {
        ...mockImage,
        id: 'img-cover',
        key: 'cover.webp',
        url: 'https://cdn.example.com/cover.webp',
      };

      prismaMock.client.image.create.mockResolvedValue(mockCoverImage);

      prismaMock.client.album.update.mockResolvedValue({
        ...mockAlbum,
        coverId: 'img-cover',
      });

      const response = await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/cover`)
        .set('Authorization', authHeader)
        .attach('file', mockFile, 'cover.png')
        .expect(201);

      expect(response.body.data.id).toBe('img-cover');
    });

    it('should return 400 if image validation fails', async () => {
      const authHeader = await getAuthHeader();
      const mockFile = Buffer.from('invalid-image');

      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);
      imageServiceMock.validateImage.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/cover`)
        .set('Authorization', authHeader)
        .attach('file', mockFile, 'cover.txt')
        .expect(400);
    });
  });

  describe('POST /library/albums/:id/tracks/bulk', () => {
    it('should create multiple tracks successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      const mockTrack1: Track = trackBuilder({
        id: 'track-1',
        albumId: mockAlbum.id,
      });
      const mockTrack2: Track = trackBuilder({
        id: 'track-2',
        albumId: mockAlbum.id,
      });

      prismaMock.client.track.create
        .mockResolvedValueOnce(mockTrack1)
        .mockResolvedValueOnce(mockTrack2);
      prismaMock.client.libraryTrack.create
        .mockResolvedValueOnce(
          libraryTrackBuilder({
            trackId: mockTrack1.id,
            libraryId: mockLibrary.id,
          }),
        )
        .mockResolvedValueOnce(
          libraryTrackBuilder({
            trackId: mockTrack2.id,
            libraryId: mockLibrary.id,
          }),
        );

      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk`)
        .set('Authorization', authHeader)
        .send({
          tracks: [
            {
              title: mockTrack1.title,
              trackNumber: mockTrack1.trackNumber,
              diskNumber: mockTrack1.diskNumber,
              artistIds: ['artist-123'],
            },
            {
              title: mockTrack2.title,
              trackNumber: mockTrack2.trackNumber,
              diskNumber: mockTrack2.diskNumber,
              artistIds: ['artist-123'],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.tracks).toHaveLength(2);
      expect(response.body.data.tracks[0].title).toBe(mockTrack1.title);
      expect(response.body.data.tracks[1].title).toBe(mockTrack2.title);
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk`)
        .send({
          tracks: [{ title: 'Track 1', trackNumber: 1, artistIds: ['artist-123'] }],
        })
        .expect(401);
    });

    it('should return 400 for invalid input (missing title)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk`)
        .set('Authorization', authHeader)
        .send({
          tracks: [{ trackNumber: 1, artistIds: ['artist-123'] }],
        })
        .expect(400);
    });
  });

  describe('POST /library/albums/:id/tracks/bulk/audio', () => {
    const mockTrackWithAccess: TrackGetPayload<{
      include: { artists: true; album: true; access: true };
    }> = {
      ...trackBuilder({ id: 'track-1', albumId: mockAlbum.id }),
      access: [
        trackAccessBuilder({
          id: 'access-1',
          userId: mockUser.id,
          role: AccessRole.owner,
          trackId: 'track-1',
        }),
      ],
      artists: [artistBuilder()],
      album: mockAlbum,
    };

    it('should upload multiple audio files successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);

      prismaMock.client.track.findUnique
        .mockResolvedValueOnce(mockTrackWithAccess)
        .mockResolvedValueOnce(mockTrackWithAccess);

      storageServiceMock.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/audio.mp3',
        key: 'key',
      });

      const mockAudioFile1 = audioFileBuilder({
        trackId: mockTrackWithAccess.id,
      });
      const mockAudioFile2 = audioFileBuilder({
        trackId: mockTrackWithAccess.id,
      });

      prismaMock.client.audioFile.create
        .mockResolvedValueOnce(mockAudioFile1)
        .mockResolvedValueOnce(mockAudioFile2);

      const response = await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk/audio`)
        .set('Authorization', authHeader)
        .field('trackIds', JSON.stringify([mockTrackWithAccess.id, mockTrackWithAccess.id]))
        .attach('files', Buffer.from(mockAudioFile1.key), {
          filename: mockAudioFile1.key,
          contentType: mockAudioFile1.mimeType,
        })
        .attach('files', Buffer.from(mockAudioFile2.key), {
          filename: mockAudioFile2.key,
          contentType: mockAudioFile2.mimeType,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.audioFiles).toHaveLength(2);
    });

    it('should return 400 if trackIds count does not match files count', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk/audio`)
        .set('Authorization', authHeader)
        .field('trackIds', JSON.stringify(['track-1']))
        .attach('files', Buffer.from('fake-audio-1'), {
          filename: 'test1.mp3',
          contentType: 'audio/mpeg',
        })
        .attach('files', Buffer.from('fake-audio-2'), {
          filename: 'test2.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(400);
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk/audio`)
        .field('trackIds', JSON.stringify(['track-1', 'track-2']))
        .attach('files', Buffer.from('fake-audio-1'), {
          filename: 'test1.mp3',
          contentType: 'audio/mpeg',
        })
        .attach('files', Buffer.from('fake-audio-2'), {
          filename: 'test2.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(401);
    });

    it('should return 400 if more than 50 files are uploaded', async () => {
      const authHeader = await getAuthHeader();
      const trackIds = Array.from({ length: 51 }, (_, i) => `track-${i}`);
      const req = request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk/audio`)
        .set('Authorization', authHeader)
        .field('trackIds', JSON.stringify(trackIds));

      for (let i = 0; i < 51; i++) {
        req.attach('files', Buffer.from(`fake-audio-${i}`), {
          filename: `test${i}.mp3`,
          contentType: 'audio/mpeg',
        });
      }

      await req.expect(400);
    });
  });

  describe('GET /library/albums/:id/tracks', () => {
    it('should return album tracks successfully (200)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findUnique.mockResolvedValue(mockAlbum);

      const mockLibraryTrackList: LibraryTrackWithRelations[] = [
        {
          ...libraryTrackBuilder({
            trackId: 'track-1',
            libraryId: mockLibrary.id,
          }),
          track: {
            ...trackBuilder({ id: 'track-1', albumId: mockAlbum.id }),
            artists: [artistBuilder()],
            album: mockAlbum,
            access: [
              trackAccessBuilder({
                id: 'access-1',
                userId: 'user-123',
                role: 'owner',
                trackId: 'track-1',
              }),
            ],
          },
        },
      ];
      prismaMock.client.libraryTrack.findMany.mockResolvedValue(mockLibraryTrackList);
      prismaMock.client.libraryTrack.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get(`/library/albums/${mockAlbum.id}/tracks`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(mockLibraryTrackList[0].track.id);
    });

    it('should return 404 if album not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/albums/non-existent/tracks')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });
});
