import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AudioFile, AudioFormat, AudioQuality, FileBucket, PrismaClient, ProcessingStatus } from '@repo/db';
import {
  // @ts-expect-error - ignore type errors from testing package imports
  buildLibrary,
  // @ts-expect-error - ignore type errors from testing package imports
  buildLibraryTrackWithRelations,
  // @ts-expect-error - ignore type errors from testing package imports
  buildTrackWithRelations,
  // @ts-expect-error - ignore type errors from testing package imports
  buildUser,
  // @ts-expect-error - ignore type errors from testing package imports
  createAuthHeaderFactory,
  // @ts-expect-error - ignore type errors from testing package imports
  PrismaServiceMock,
} from '@repo/testing';
import { Readable } from 'stream';
import request from 'supertest';
import { vi } from 'vitest';
import { StorageService } from '../src/shared/services/storage.service';
import './setup-env';
import { createIntegrationApp } from './test-utils';

describe('LibraryTracksController (Integration)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let getAuthHeader: ReturnType<typeof createAuthHeaderFactory>;
  let storageServiceMock: { getFileStream: any };

  const mockUser = buildUser({ username: 'testu' });
  const mockLibrary = buildLibrary();
  const mockTrack = buildTrackWithRelations();
  const mockLibraryTrack = buildLibraryTrackWithRelations({ track: mockTrack });

  beforeAll(async () => {
    storageServiceMock = {
      getFileStream: vi.fn(),
    };

    const setup = await createIntegrationApp((builder) => {
      return builder.overrideProvider(StorageService).useValue(storageServiceMock);
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

  describe('POST /library/tracks', () => {
    it('should create a track successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
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

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
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

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
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

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
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

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
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

    it('should return 404 if no processed audio file found', async () => {
      const authHeader = await getAuthHeader();
      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.audioFile.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/stream`)
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return full stream successfully for standard quality (default)', async () => {
      const authHeader = await getAuthHeader();
      const content = 'test-audio-content';
      const mockAudioFile: AudioFile = {
        id: 'audio-123',
        trackId: mockTrack.id,
        status: 'complete' as ProcessingStatus,
        format: 'mp3' as AudioFormat,
        quality: 'standard' as AudioQuality,
        size: content.length,
        bucket: 'tracks' as FileBucket,
        key: 'track-123.mp3',
        mimeType: 'audio/mpeg',
        url: null,
        duration: 180,
        bitrate: 320,
        sampleRate: 44100,
        channels: 2,
        isOriginal: true,
        waveformJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);
      prismaMock.client.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      storageServiceMock.getFileStream.mockResolvedValue({
        stream: Readable.from([Buffer.from(content)]),
      });

      const response = await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/stream`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.toString()).toBe(content);
      expect(storageServiceMock.getFileStream).toHaveBeenCalled();
    });

    it('should return 206 Partial Content for byte-range requests', async () => {
      const authHeader = await getAuthHeader();
      const content = 'chunk';
      const mockAudioFile: AudioFile = {
        id: 'audio-123',
        trackId: mockTrack.id,
        status: 'complete' as ProcessingStatus,
        format: 'mp3' as AudioFormat,
        quality: 'standard' as AudioQuality,
        size: content.length,
        bucket: 'tracks' as FileBucket,
        key: 'track-123.mp3',
        mimeType: 'audio/mpeg',
        url: null,
        duration: 180,
        bitrate: 320,
        sampleRate: 44100,
        channels: 2,
        isOriginal: true,
        waveformJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);
      prismaMock.client.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      storageServiceMock.getFileStream.mockResolvedValue({
        stream: Readable.from([Buffer.from(content)]),
      });

      const response = await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/stream`)
        .set('Authorization', authHeader)
        .set('Range', `bytes=0-${content.length - 1}`)
        .expect(206);

      expect(response.body.toString()).toBe(content);
      expect(response.header['content-range']).toBe(
        `bytes 0-${content.length - 1}/${content.length}`,
      );
    });

    it('should respect requested quality', async () => {
      const authHeader = await getAuthHeader();
      const commonFields = {
        trackId: mockTrack.id,
        status: 'complete' as ProcessingStatus,
        format: 'mp3' as AudioFormat,
        bucket: 'tracks' as FileBucket,
        mimeType: 'audio/mpeg',
        url: null,
        duration: 180,
        bitrate: 320,
        sampleRate: 44100,
        channels: 2,
        isOriginal: true,
        waveformJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockFiles: AudioFile[] = [
        {
          ...commonFields,
          id: 'audio-std',
          quality: 'standard' as AudioQuality,
          size: 1000,
          key: 'std.mp3',
        },
        {
          ...commonFields,
          id: 'audio-high',
          quality: 'high' as AudioQuality,
          size: 2000,
          key: 'high.mp3',
        },
      ];

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);
      prismaMock.client.audioFile.findMany.mockResolvedValue(mockFiles);

      storageServiceMock.getFileStream.mockResolvedValue({
        stream: Readable.from([Buffer.alloc(2000)]),
      });

      await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/stream?quality=high`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(storageServiceMock.getFileStream).toHaveBeenCalledWith(
        'tracks',
        'high.mp3',
        expect.any(Object),
      );
    });
  });
});
