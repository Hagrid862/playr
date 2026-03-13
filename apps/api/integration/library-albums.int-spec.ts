import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    AccessRole,
    AudioFormat,
    AudioQuality,
    FileBucket,
    PrismaClient,
    ProcessingStatus,
} from '@repo/db';
import {
    // @ts-expect-error - ignore type errors from testing package imports
    buildAlbumWithRelations,
    // @ts-expect-error - ignore type errors from testing package imports
    buildImageForIntegration,
    // @ts-expect-error - ignore type errors from testing package imports
    buildLibrary,
    // @ts-expect-error - ignore type errors from testing package imports
    buildLibraryAlbumWithRelations,
    // @ts-expect-error - ignore type errors from testing package imports
    buildTrack,
    // @ts-expect-error - ignore type errors from testing package imports
    buildTrackAccess,
    // @ts-expect-error - ignore type errors from testing package imports
    buildTrackWithRelations,
    // @ts-expect-error - ignore type errors from testing package imports
    buildUser,
    // @ts-expect-error - ignore type errors from testing package imports
    createAuthHeaderFactory,
    // @ts-expect-error - ignore type errors from testing package imports
    DEFAULT_TEST_USER_ID,
    // @ts-expect-error - ignore type errors from testing package imports
    PrismaServiceMock,
    // @ts-expect-error - ignore type errors from testing package imports
    type AlbumWithRelations
} from '@repo/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { ImageService } from '../src/shared/services/image.service';
import { StorageService } from '../src/shared/services/storage.service';
import './setup-env';
import { createIntegrationApp } from './test-utils';

describe('LibraryAlbumsController (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let getAuthHeader: ReturnType<typeof createAuthHeaderFactory>;
  let storageServiceMock: { uploadFile: any; deleteFile: any };
  let imageServiceMock: { validateImage: any; resizeToMaxDimension: any };

  const mockLibrary = buildLibrary();
  const mockAlbum = buildAlbumWithRelations();
  const mockLibraryAlbum = buildLibraryAlbumWithRelations({ album: mockAlbum });

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
    const jwtService = app.get(JwtService);
    const config = app.get(ConfigService);
    getAuthHeader = createAuthHeaderFactory(jwtService, config);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /library/albums', () => {
    it('should create an album successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(null); // No conflict
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
          artistId: 'artist-123',
        })
        .expect(201);

      expect(response.body.data.id).toBe(mockAlbum.id);
      expect(response.body.data.name).toBe(mockAlbum.name);
    });

    it('should return 409 if album name already exists for user', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum); // Conflict

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
          artistId: 'artist-123',
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
      prismaMock.client.libraryAlbum.findMany.mockResolvedValue([
        mockLibraryAlbum,
      ]);
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
      // Access guard check
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);
      // Handler check
      prismaMock.client.album.findUnique.mockResolvedValue(mockAlbum);

      const response = await request(app.getHttpServer())
        .get(`/library/albums/${mockAlbum.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.data.id).toBe(mockAlbum.id);
    });

    it('should return 404 if album not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findFirst.mockResolvedValue(null);
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

      // Access guard check
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      // Handler checks
      prismaMock.client.album.findUnique.mockResolvedValue(mockAlbum);
      // Conflict check (simulate no conflict)
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

      // Access guard
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      // Handler
      prismaMock.client.album.findUnique.mockResolvedValue(mockAlbum);
      // Soft delete via update
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

    it('should return 404 if album to delete not found', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.album.findFirst.mockResolvedValue(null);
      prismaMock.client.album.findUnique.mockResolvedValue(null);

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

      const mockCoverImage = buildImageForIntegration({
        id: 'img-cover',
        key: 'cover.webp',
        url: 'https://cdn.example.com/cover.webp',
      });

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
    const mockUser = buildUser({ username: 'testu' });

    it('should create multiple tracks successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      const mockTrack1 = buildTrack({
        id: 'track-1',
        title: 'Track 1',
        trackNumber: 1,
        diskNumber: 1,
        duration: 0,
        albumId: mockAlbum.id,
      });
      const mockTrack2 = buildTrack({
        id: 'track-2',
        title: 'Track 2',
        trackNumber: 2,
        diskNumber: 1,
        duration: 0,
        albumId: mockAlbum.id,
      });

      prismaMock.client.track.create
        .mockResolvedValueOnce(mockTrack1)
        .mockResolvedValueOnce(mockTrack2);
      prismaMock.client.libraryTrack.create.mockResolvedValue({} as any);

      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk`)
        .set('Authorization', authHeader)
        .send({
          tracks: [
            { title: 'Track 1', trackNumber: 1, diskNumber: 1, artistIds: ['artist-123'] },
            { title: 'Track 2', trackNumber: 2, diskNumber: 1, artistIds: ['artist-123'] },
          ],
        });

      if (response.status !== 201) {
        console.log(
          'POST /library/albums/:id/tracks/bulk error:',
          JSON.stringify(response.body, null, 2),
        );
      }

      expect(response.status).toBe(201);
      expect(response.body.data.tracks).toHaveLength(2);
      expect(response.body.data.tracks[0].title).toBe('Track 1');
      expect(response.body.data.tracks[1].title).toBe('Track 2');
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
    const mockUser = buildUser({ id: DEFAULT_TEST_USER_ID, username: 'testu' });
    const mockTrackWithAccess = buildTrackWithRelations({
      id: 'track-1',
      title: 'Track 1',
      trackNumber: 1,
      diskNumber: 1,
      duration: 0,
      albumId: mockAlbum.id,
      album: mockAlbum,
      artists: [],
      access: [
        buildTrackAccess({
          id: 'access-1',
          userId: DEFAULT_TEST_USER_ID,
          role: AccessRole.owner,
          trackId: 'track-1',
        }),
      ],
    });

    it('should upload multiple audio files successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      prismaMock.client.track.findFirst
        .mockResolvedValueOnce(mockTrackWithAccess)
        .mockResolvedValueOnce(mockTrackWithAccess);

      storageServiceMock.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/audio.mp3',
        key: 'key',
      });

      const mockAudioFile1 = {
        id: 'audio-1',
        trackId: 'track-1',
        status: ProcessingStatus.pending,
        format: AudioFormat.mp3,
        quality: AudioQuality.original,
        size: 100,
        bucket: FileBucket.private,
        key: 'key1',
        mimeType: 'audio/mpeg',
        url: 'https://cdn.example.com/audio.mp3',
        duration: null,
        bitrate: null,
        sampleRate: null,
        channels: null,
        isOriginal: true,
        waveformJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockAudioFile2 = { ...mockAudioFile1, id: 'audio-2', key: 'key2' };

      prismaMock.client.audioFile.create
        .mockResolvedValueOnce(mockAudioFile1)
        .mockResolvedValueOnce(mockAudioFile2);

      const response = await request(app.getHttpServer())
        .post(`/library/albums/${mockAlbum.id}/tracks/bulk/audio`)
        .set('Authorization', authHeader)
        .field('trackIds', JSON.stringify(['track-1', 'track-1']))
        .attach('files', Buffer.from('fake-audio-1'), {
          filename: 'test1.mp3',
          contentType: 'audio/mpeg',
        })
        .attach('files', Buffer.from('fake-audio-2'), {
          filename: 'test2.mp3',
          contentType: 'audio/mpeg',
        });

      if (response.status !== 201) {
        console.log(
          'POST /library/albums/:id/tracks/bulk/audio error:',
          JSON.stringify(response.body, null, 2),
        );
      }

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
      prismaMock.client.album.findFirst.mockResolvedValue(mockAlbum);

      const mockLibraryTrackList = [{ track: { id: 'track-1', title: 'Test Track' } }];
      prismaMock.client.libraryTrack.findMany.mockResolvedValue(mockLibraryTrackList as any);
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

      prismaMock.client.album.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/library/albums/non-existent/tracks')
        .set('Authorization', authHeader)
        .expect(404);
    });
  });
});
