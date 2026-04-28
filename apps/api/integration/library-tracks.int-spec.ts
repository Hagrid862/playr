import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AudioFile,
  AudioFormat,
  AudioQuality,
  FileBucket,
  Library,
  LibraryTrack,
  PrismaClient,
  ProcessingStatus,
  TrackGetPayload,
  User,
} from '@repo/db';
import {
  albumBuilder,
  artistBuilder,
  audioFileBuilder,
  libraryBuilder,
  libraryTrackBuilder,
  trackAccessBuilder,
  trackBuilder,
  userBuilder,
} from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import { Readable } from 'stream';
import request from 'supertest';
import { StorageService } from '../src/shared/services/storage.service';
import './setup-env';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
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
  let storageServiceMock: { getFileStream: any };

  beforeAll(async () => {
    storageServiceMock = {
      getFileStream: vi.fn(),
    };

    const setup = await createIntegrationApp((builder) => {
      return builder.overrideProvider(StorageService).useValue(storageServiceMock);
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

  const mockUser: User = userBuilder({ id: 'user-123' });

  const mockLibrary: Library = libraryBuilder({ id: 'library-123', userId: 'user-123' });

  const mockTrack: TrackWithRelations = {
    ...trackBuilder({ id: 'track-123', albumId: 'album-123' }),
    album: albumBuilder({ id: 'album-123' }),
    artists: [artistBuilder({ id: 'artist-123' })],
    access: [
      trackAccessBuilder({
        id: 'access-123',
        userId: 'user-123',
        role: 'owner',
        trackId: 'track-123',
      }),
    ],
  };

  const mockLibraryTrack: LibraryTrackWithRelations = {
    ...libraryTrackBuilder({ id: 'lib-track-123', libraryId: 'library-123', trackId: 'track-123' }),
    track: mockTrack,
  };

  describe('POST /library/tracks', () => {
    it('should create a track successfully (201)', async () => {
      const authHeader = await getAuthHeader();

      prismaMock.client.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
      prismaMock.client.album.findUnique.mockResolvedValue(mockTrack.album);
      prismaMock.client.track.create.mockResolvedValue(mockTrack);
      prismaMock.client.libraryTrack.create.mockResolvedValue(mockLibraryTrack);

      prismaMock.mainClient.$transaction.mockImplementation(
        async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
      );

      const response = await request(app.getHttpServer())
        .post('/library/tracks')
        .set('Authorization', authHeader)
        .send({
          title: mockTrack.title,
          albumId: mockTrack.album.id,
          trackNumber: mockTrack.trackNumber,
          diskNumber: mockTrack.diskNumber,
          explicit: mockTrack.explicit,
          artistIds: mockTrack.artists.map((artist) => artist.id),
        });

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
      prismaMock.client.track.findUnique.mockResolvedValue(mockTrack);

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
      prismaMock.client.track.findUnique.mockResolvedValue(mockTrack);
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
      prismaMock.client.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.client.audioFile.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/stream`)
        .set('Authorization', authHeader)
        .expect(404);
    });

    it('should return full stream successfully for standard quality (default)', async () => {
      const authHeader = await getAuthHeader();
      const content = 'test-audio-content';
      const mockAudioFile: AudioFile = audioFileBuilder({
        trackId: mockTrack.id,
        size: Buffer.from(content).length,
        status: ProcessingStatus.complete,
      });

      prismaMock.client.user.findFirst.mockResolvedValue(mockUser);
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
      expect(response.get('Content-Type')).toBe(mockAudioFile.mimeType);
      expect(storageServiceMock.getFileStream).toHaveBeenCalled();
    });

    it('should return 206 Partial Content for byte-range requests', async () => {
      const authHeader = await getAuthHeader();
      const content = 'chunk';
      const mockAudioFile: AudioFile = audioFileBuilder({
        trackId: mockTrack.id,
        size: Buffer.from(content).length,
        status: ProcessingStatus.complete,
      });

      prismaMock.client.user.findFirst.mockResolvedValue(mockUser);
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
      const content = 'high-quality-audio';
      const mockFiles: AudioFile[] = [
        audioFileBuilder({
          trackId: mockTrack.id,
          quality: AudioQuality.standard,
          format: AudioFormat.mp3,
          size: 1000,
          key: 'std.mp3',
          bucket: FileBucket.private,
        }),
        audioFileBuilder({
          trackId: mockTrack.id,
          quality: AudioQuality.high,
          format: AudioFormat.mp3,
          size: Buffer.from(content).length,
          key: 'high.mp3',
          bucket: FileBucket.private,
        }),
      ];

      prismaMock.client.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.client.track.findFirst.mockResolvedValue(mockTrack);
      prismaMock.client.audioFile.findMany.mockResolvedValue(mockFiles);

      storageServiceMock.getFileStream.mockResolvedValue({
        stream: Readable.from([Buffer.from(content)]),
      });

      const response = await request(app.getHttpServer())
        .get(`/library/tracks/${mockTrack.id}/stream?quality=high`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.toString()).toBe(content);
      expect(storageServiceMock.getFileStream).toHaveBeenCalledWith(
        FileBucket.private,
        'high.mp3',
        expect.any(Object),
      );
    });
  });
});
