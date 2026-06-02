import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Playlist, PlaylistSidebarPin, Library, Image, PrismaClient } from '@repo/db';
import { libraryBuilder, imageBuilder } from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';
import request from 'supertest';
import { ImageService } from '../src/shared/services/image.service';
import { StorageService } from '../src/shared/services/storage.service';
import { setupJwtAuthPrismaMocks } from './jwt-auth-prisma-setup';
import { createIntegrationApp } from './test-utils';
import './setup-env';

function mockPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-123',
    name: 'My Playlist',
    systemRole: null,
    coverId: null,
    libraryId: 'library-123',
    artistId: null,
    description: null,
    isPublic: false,
    isCollaborative: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockPin(overrides: Partial<PlaylistSidebarPin> = {}): PlaylistSidebarPin {
  return {
    id: 'pin-123',
    libraryId: 'library-123',
    playlistId: 'playlist-123',
    order: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LibraryPlaylistsController & LibraryPlaylistPinsController (Integration)', () => {
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

  describe('Playlist Operations', () => {
    describe('POST /library/playlists', () => {
      it('should create playlist successfully (201)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist({ name: 'Chill Vibes' });

        prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
        prismaMock.client.playlist.findFirst.mockResolvedValue(null); // name available
        prismaMock.client.playlist.create.mockResolvedValue(playlist);

        const response = await request(app.getHttpServer())
          .post('/library/playlists')
          .set('Authorization', authHeader)
          .send({ name: 'Chill Vibes' })
          .expect(201);

        expect(response.body.data.id).toBe(playlist.id);
        expect(response.body.data.name).toBe('Chill Vibes');
      });

      it('should return conflict (409) if playlist name is already taken', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist({ name: 'Chill Vibes' });

        prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist); // name taken

        await request(app.getHttpServer())
          .post('/library/playlists')
          .set('Authorization', authHeader)
          .send({ name: 'Chill Vibes' })
          .expect(409);
      });
    });

    describe('GET /library/playlists', () => {
      it('should list library playlists (200)', async () => {
        const authHeader = await getAuthHeader();
        const playlistWithRelations = {
          ...mockPlaylist(),
          cover: null,
          _count: { tracks: 5 },
        };

        prismaMock.client.playlist.findMany.mockResolvedValue([playlistWithRelations]);

        const response = await request(app.getHttpServer())
          .get('/library/playlists')
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.items[0].id).toBe(playlistWithRelations.id);
        expect(response.body.data.items[0].trackCount).toBe(5);
      });
    });

    describe('GET /library/playlists/:id', () => {
      it('should get playlist detail page with tracks (200)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();

        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        prismaMock.client.playlistTrack.count.mockResolvedValue(1);
        const mockPlaylistTracks: any[] = [
          {
            id: 'pt-1',
            playlistId: playlist.id,
            trackId: 'track-1',
            order: 0,
            addedAt: new Date(),
            deletedAt: null,
            track: {
              id: 'track-1',
              title: 'Lo-Fi Chill',
              duration: 180,
              trackNumber: 1,
              diskNumber: 1,
              explicit: false,
              artists: [],
              album: null,
              genres: [],
            },
          },
        ];
        prismaMock.client.playlistTrack.findMany.mockResolvedValue(mockPlaylistTracks);

        const response = await request(app.getHttpServer())
          .get(`/library/playlists/${playlist.id}`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data.id).toBe(playlist.id);
        expect(response.body.data.tracks).toHaveLength(1);
        expect(response.body.data.tracks[0].track.title).toBe('Lo-Fi Chill');
        expect(response.body.data.totalTracks).toBe(1);
      });

      it('should return 404 if playlist not found', async () => {
        const authHeader = await getAuthHeader();

        prismaMock.client.playlist.findFirst.mockResolvedValue(null);

        await request(app.getHttpServer())
          .get('/library/playlists/non-existent')
          .set('Authorization', authHeader)
          .expect(404);
      });
    });

    describe('PATCH /library/playlists/:id', () => {
      it('should update playlist name successfully (200)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();
        const updated = mockPlaylist({ name: 'Chill Vibes 2' });

        prismaMock.client.playlist.findFirst
          .mockResolvedValueOnce(playlist) // find active playlist
          .mockResolvedValueOnce(null); // name available for rename
        prismaMock.client.playlist.update.mockResolvedValue(updated);
        const mockPlaylistsWithCovers: any[] = [
          {
            ...updated,
            cover: null,
            _count: { tracks: 5 },
          },
        ];
        prismaMock.client.playlist.findMany.mockResolvedValue(mockPlaylistsWithCovers);
        prismaMock.client.playlistSidebarPin.findMany.mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .patch(`/library/playlists/${playlist.id}`)
          .set('Authorization', authHeader)
          .send({ name: 'Chill Vibes 2' })
          .expect(200);

        expect(response.body.data.name).toBe('Chill Vibes 2');
      });
    });

    describe('DELETE /library/playlists/:id', () => {
      it('should soft delete playlist (200)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();

        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        prismaMock.client.playlist.update.mockResolvedValue({
          ...playlist,
          deletedAt: new Date(),
        });

        const response = await request(app.getHttpServer())
          .delete(`/library/playlists/${playlist.id}`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data.id).toBe(playlist.id);
      });
    });
  });

  describe('Cover Images', () => {
    describe('POST /library/playlists/:id/cover', () => {
      it('should upload cover successfully (201)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();
        const mockFile = Buffer.from('image-data');
        const mockCover: Image = imageBuilder({
          id: 'img-1',
          url: 'https://cdn.example.com/cover.webp',
        });

        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        imageServiceMock.validateImage.mockResolvedValue(true);
        imageServiceMock.resizeToMaxDimension.mockResolvedValue(mockFile);
        storageServiceMock.uploadFile.mockResolvedValue({
          url: 'https://cdn.example.com/cover.webp',
          key: 'playlists/123/cover.webp',
        });

        prismaMock.mainClient.$transaction.mockImplementation(
          async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
        );
        prismaMock.client.image.create.mockResolvedValue(mockCover);
        prismaMock.client.playlist.update.mockResolvedValue({
          ...playlist,
          coverId: mockCover.id,
        });

        const response = await request(app.getHttpServer())
          .post(`/library/playlists/${playlist.id}/cover`)
          .set('Authorization', authHeader)
          .attach('file', mockFile, 'cover.png')
          .expect(201);

        expect(response.body.data.id).toBe(mockCover.id);
        expect(response.body.data.url).toBe(mockCover.url);
      });
    });

    describe('DELETE /library/playlists/:id/cover', () => {
      it('should remove cover successfully (200)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist({ coverId: 'cover-123' });

        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        prismaMock.client.image.findUnique.mockResolvedValue({ key: 'cover-123.webp' } as any);
        prismaMock.client.playlist.update.mockResolvedValue({
          ...playlist,
          coverId: null,
        });

        prismaMock.mainClient.$transaction.mockImplementation(
          async (cb: (client: PrismaClient) => Promise<any>) => cb(prismaMock.client),
        );

        const response = await request(app.getHttpServer())
          .delete(`/library/playlists/${playlist.id}/cover`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data.id).toBe(playlist.id);
      });
    });
  });

  describe('Playlist Tracks & Albums', () => {
    describe('POST /library/playlists/:id/tracks', () => {
      it('should add track to playlist (201)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();

        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        prismaMock.client.track.count.mockResolvedValue(1); // track assignable
        prismaMock.client.playlistTrack.findUnique.mockResolvedValue(null);
        prismaMock.client.playlistTrack.aggregate.mockResolvedValue({
          _max: { order: 0 },
          _count: undefined,
          _sum: undefined,
          _avg: undefined,
          _min: undefined,
        });
        prismaMock.client.playlistTrack.create.mockResolvedValue({} as any);

        const response = await request(app.getHttpServer())
          .post(`/library/playlists/${playlist.id}/tracks`)
          .set('Authorization', authHeader)
          .send({ trackId: 'track-123' })
          .expect(201);

        expect(response.body.data.ok).toBe(true);
      });
    });

    describe('DELETE /library/playlists/:id/tracks/:trackId', () => {
      it('should remove track from playlist (200)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();

        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        prismaMock.client.playlistTrack.findUnique.mockResolvedValue({
          id: 'pt-123',
          playlistId: playlist.id,
          trackId: 'track-123',
          deletedAt: null,
        } as any);
        prismaMock.client.playlistTrack.update.mockResolvedValue({} as any);

        const response = await request(app.getHttpServer())
          .delete(`/library/playlists/${playlist.id}/tracks/track-123`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data.ok).toBe(true);
      });
    });
  });

  describe('Playlist Pins', () => {
    describe('POST /library/playlist-pins', () => {
      it('should pin playlist successfully (201)', async () => {
        const authHeader = await getAuthHeader();
        const playlist = mockPlaylist();
        const pin = mockPin();

        prismaMock.client.library.findUnique.mockResolvedValue(mockLibrary);
        prismaMock.client.playlist.findFirst.mockResolvedValue(playlist);
        prismaMock.client.playlistSidebarPin.findFirst.mockResolvedValue(null); // not pinned yet
        prismaMock.client.playlistSidebarPin.aggregate.mockResolvedValue({
          _max: { order: -1 },
          _count: undefined,
          _sum: undefined,
          _avg: undefined,
          _min: undefined,
        });
        prismaMock.client.playlistSidebarPin.create.mockResolvedValue(pin);

        const response = await request(app.getHttpServer())
          .post('/library/playlist-pins')
          .set('Authorization', authHeader)
          .send({ playlistId: playlist.id })
          .expect(201);

        expect(response.body.data.id).toBe(pin.id);
        expect(response.body.data.playlist.id).toBe(playlist.id);
      });
    });

    describe('GET /library/playlist-pins', () => {
      it('should list pinned playlists (200)', async () => {
        const authHeader = await getAuthHeader();
        const pinWithPlaylist = {
          ...mockPin(),
          playlist: {
            ...mockPlaylist(),
            cover: null,
          },
        };

        prismaMock.client.playlistSidebarPin.findMany.mockResolvedValue([pinWithPlaylist]);

        const response = await request(app.getHttpServer())
          .get('/library/playlist-pins')
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(pinWithPlaylist.id);
        expect(response.body.data[0].playlist.id).toBe(pinWithPlaylist.playlist.id);
      });
    });

    describe('DELETE /library/playlist-pins/:id', () => {
      it('should unpin playlist sidebar pin (200)', async () => {
        const authHeader = await getAuthHeader();
        const pin = mockPin();

        prismaMock.client.playlistSidebarPin.findFirst.mockResolvedValue(pin);
        prismaMock.client.playlistSidebarPin.update.mockResolvedValue({
          ...pin,
          deletedAt: new Date(),
        });

        const response = await request(app.getHttpServer())
          .delete(`/library/playlist-pins/${pin.id}`)
          .set('Authorization', authHeader)
          .expect(200);

        expect(response.body.data.id).toBe(pin.id);
      });
    });
  });
});
