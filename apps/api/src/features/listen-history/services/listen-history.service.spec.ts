import { Logger } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@/shared/services/prisma.service';
import { ListenHistoryService } from './listen-history.service';

type ListenHistoryClientMock = {
  findFirst: ReturnType<
    typeof vi.fn<(args?: Prisma.ListenHistoryFindFirstArgs) => Promise<unknown>>
  >;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
};

describe('ListenHistoryService', () => {
  let prisma: DeepMocked<PrismaService>;
  let service: ListenHistoryService;
  let mockListenHistoryClient: ListenHistoryClientMock;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  const userId = 'user-123';
  const trackId = 'track-456';

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    prisma = createMock<PrismaService>();
    mockListenHistoryClient = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    };

    Object.defineProperty(prisma, 'client', {
      value: {
        listenHistory: mockListenHistoryClient,
      },
      writable: true,
      configurable: true,
    });

    service = new ListenHistoryService(prisma);
    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    loggerErrorSpy.mockRestore();
  });

  describe('recordListen', () => {
    it('creates a new listen history record when no previous history exists', async () => {
      mockListenHistoryClient.findFirst.mockResolvedValue(null);
      mockListenHistoryClient.create.mockResolvedValue({ id: 'lh-1' });
      mockListenHistoryClient.count.mockResolvedValue(1);

      await service.recordListen(userId, trackId);

      expect(mockListenHistoryClient.findFirst).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
        orderBy: { listenedAt: 'desc' },
      });
      expect(mockListenHistoryClient.create).toHaveBeenCalledWith({
        data: {
          userId,
          trackId,
          completed: false,
        },
      });
      expect(mockListenHistoryClient.count).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
      });
    });

    it('skips duplicate inserts if the last track played matches and is within 30s cooldown', async () => {
      const thirtySecondsAgo = new Date(Date.now() - 10000); // 10 seconds ago
      mockListenHistoryClient.findFirst.mockResolvedValue({
        id: 'lh-prev',
        trackId,
        listenedAt: thirtySecondsAgo,
      });

      await service.recordListen(userId, trackId);

      expect(mockListenHistoryClient.findFirst).toHaveBeenCalled();
      expect(mockListenHistoryClient.create).not.toHaveBeenCalled();
    });

    it('creates a new record if the track id is different even within cooldown', async () => {
      const tenSecondsAgo = new Date(Date.now() - 10000);
      mockListenHistoryClient.findFirst.mockResolvedValue({
        id: 'lh-prev',
        trackId: 'different-track-id',
        listenedAt: tenSecondsAgo,
      });
      mockListenHistoryClient.create.mockResolvedValue({ id: 'lh-new' });
      mockListenHistoryClient.count.mockResolvedValue(1);

      await service.recordListen(userId, trackId);

      expect(mockListenHistoryClient.create).toHaveBeenCalled();
    });

    it('creates a new record if the cooldown window of 30 seconds has expired', async () => {
      const fortySecondsAgo = new Date(Date.now() - 40000);
      mockListenHistoryClient.findFirst.mockResolvedValue({
        id: 'lh-prev',
        trackId,
        listenedAt: fortySecondsAgo,
      });
      mockListenHistoryClient.create.mockResolvedValue({ id: 'lh-new' });
      mockListenHistoryClient.count.mockResolvedValue(1);

      await service.recordListen(userId, trackId);

      expect(mockListenHistoryClient.create).toHaveBeenCalled();
    });

    it('prunes the oldest records if history entries exceed the 4096 limit', async () => {
      mockListenHistoryClient.findFirst.mockImplementation(async (args) => {
        if (args?.skip === 4095) {
          return { id: 'lh-boundary', listenedAt: new Date('2026-01-01T00:00:00Z') };
        }
        return null;
      });

      mockListenHistoryClient.create.mockResolvedValue({ id: 'lh-new' });
      mockListenHistoryClient.count.mockResolvedValue(4200);
      mockListenHistoryClient.deleteMany.mockResolvedValue({ count: 1 });

      await service.recordListen(userId, trackId);

      expect(mockListenHistoryClient.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
          listenedAt: {
            lt: new Date('2026-01-01T00:00:00Z'),
          },
        },
      });
    });

    it('skips pruning when the boundary entry cannot be resolved', async () => {
      mockListenHistoryClient.findFirst.mockImplementation(async (args) => {
        if (args?.skip === 4095) {
          return null;
        }
        return null;
      });
      mockListenHistoryClient.create.mockResolvedValue({ id: 'lh-new' });
      mockListenHistoryClient.count.mockResolvedValue(4200);

      await service.recordListen(userId, trackId);

      expect(mockListenHistoryClient.deleteMany).not.toHaveBeenCalled();
    });

    it('logs and swallows Error rejections during persistence', async () => {
      const error = new Error('database unavailable');
      mockListenHistoryClient.findFirst.mockRejectedValue(error);

      await expect(service.recordListen(userId, trackId)).resolves.toBeUndefined();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to record listen history: database unavailable',
        error.stack,
      );
      expect(mockListenHistoryClient.create).not.toHaveBeenCalled();
    });

    it('coerces non-Error rejections before logging', async () => {
      mockListenHistoryClient.findFirst.mockRejectedValue('connection refused');

      await expect(service.recordListen(userId, trackId)).resolves.toBeUndefined();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to record listen history: connection refused',
        expect.stringContaining('connection refused'),
      );
    });
  });

  describe('getListenHistory', () => {
    it('returns formatted and paginated list of listen history entries', async () => {
      const mockTrack = {
        id: 'track-1',
        title: 'Song Title',
        trackNumber: 1,
        diskNumber: 1,
        duration: 240,
        listenedCount: 42,
        explicit: false,
        lyrics: 'Lyrics go here',
        visibility: 'public',
        albumId: 'album-1',
        createdAt: new Date('2026-05-01T00:00:00Z'),
        updatedAt: new Date('2026-05-01T00:00:00Z'),
        deletedAt: null,
        artists: [
          {
            id: 'artist-1',
            name: 'Artist A',
            description: 'Description A',
            isCommunity: false,
            verified: true,
            bannerId: null,
            avatarId: null,
            visibility: 'public',
            createdAt: new Date('2026-05-01T00:00:00Z'),
            updatedAt: new Date('2026-05-01T00:00:00Z'),
            deletedAt: null,
          },
        ],
        album: {
          id: 'album-1',
          name: 'Album A',
          description: 'Description A',
          type: 'album',
          systemKind: 'none',
          totalTracks: 1,
          totalDuration: 240,
          releaseDate: new Date('2026-05-01T00:00:00Z'),
          libraryId: null,
          coverId: 'cover-1',
          visibility: 'public',
          createdAt: new Date('2026-05-01T00:00:00Z'),
          updatedAt: new Date('2026-05-01T00:00:00Z'),
          deletedAt: null,
          cover: {
            id: 'cover-1',
            alt: 'Alt A',
            bucket: 'public',
            key: 'key-1',
            url: 'https://example.com/cover.jpg',
            mimeType: 'image/jpeg',
            blurhash: 'blur',
            reportId: null,
            uploadStatus: 'completed',
            createdAt: new Date('2026-05-01T00:00:00Z'),
            updatedAt: new Date('2026-05-01T00:00:00Z'),
            deletedAt: null,
          },
        },
      };

      const mockEntries = [
        {
          id: 'lh-1',
          listenedAt: new Date('2026-05-27T08:00:00Z'),
          durationMs: 12000,
          completed: false,
          track: mockTrack,
        },
      ];

      mockListenHistoryClient.findMany.mockResolvedValue(mockEntries);
      mockListenHistoryClient.count.mockResolvedValue(1);

      const result = await service.getListenHistory(userId, 1, 10);

      expect(mockListenHistoryClient.findMany).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
        orderBy: { listenedAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          track: {
            include: {
              artists: true,
              album: {
                include: {
                  cover: true,
                },
              },
              genres: { include: { genre: true } },
            },
          },
        },
      });

      expect(result).toEqual({
        items: [
          {
            id: 'lh-1',
            listenedAt: '2026-05-27T08:00:00.000Z',
            durationMs: 12000,
            completed: false,
            track: {
              id: 'track-1',
              title: 'Song Title',
              trackNumber: 1,
              diskNumber: 1,
              duration: 240,
              listenedCount: 42,
              explicit: false,
              lyrics: 'Lyrics go here',
              visibility: 'public',
              albumId: 'album-1',
              artists: [
                {
                  id: 'artist-1',
                  name: 'Artist A',
                  description: 'Description A',
                  isCommunity: false,
                  verified: true,
                  bannerId: null,
                  avatarId: null,
                  visibility: 'public',
                  createdAt: '2026-05-01T00:00:00.000Z',
                  updatedAt: '2026-05-01T00:00:00.000Z',
                  deletedAt: null,
                },
              ],
              album: {
                id: 'album-1',
                name: 'Album A',
                description: 'Description A',
                type: 'album',
                systemKind: 'none',
                totalTracks: 1,
                totalDuration: 240,
                releaseDate: '2026-05-01T00:00:00.000Z',
                libraryId: null,
                coverId: 'cover-1',
                visibility: 'public',
                createdAt: '2026-05-01T00:00:00.000Z',
                updatedAt: '2026-05-01T00:00:00.000Z',
                deletedAt: null,
                cover: {
                  id: 'cover-1',
                  alt: 'Alt A',
                  bucket: 'public',
                  key: 'key-1',
                  url: 'https://example.com/cover.jpg',
                  mimeType: 'image/jpeg',
                  blurhash: 'blur',
                  reportId: null,
                  uploadStatus: 'completed',
                  createdAt: '2026-05-01T00:00:00.000Z',
                  updatedAt: '2026-05-01T00:00:00.000Z',
                  deletedAt: null,
                },
              },
              albumArt: 'https://example.com/cover.jpg',
              createdAt: '2026-05-01T00:00:00.000Z',
              updatedAt: '2026-05-01T00:00:00.000Z',
              deletedAt: null,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('formats tracks without album relations', async () => {
      const mockEntries = [
        {
          id: 'lh-minimal',
          listenedAt: new Date('2026-05-27T09:00:00Z'),
          durationMs: 0,
          completed: true,
          track: {
            id: 'track-minimal',
            title: 'Standalone',
            trackNumber: 1,
            diskNumber: 1,
            duration: 180,
            listenedCount: 0,
            explicit: true,
            lyrics: null,
            visibility: 'private',
            albumId: 'album-missing',
            createdAt: new Date('2026-05-01T00:00:00Z'),
            updatedAt: new Date('2026-05-02T00:00:00Z'),
            deletedAt: new Date('2026-05-03T00:00:00Z'),
            artists: [
              {
                id: 'artist-1',
                name: 'Solo Artist',
                description: null,
                isCommunity: true,
                verified: false,
                bannerId: null,
                avatarId: null,
                visibility: 'community',
                createdAt: new Date('2026-05-01T00:00:00Z'),
                updatedAt: new Date('2026-05-01T00:00:00Z'),
                deletedAt: new Date('2026-05-04T00:00:00Z'),
              },
            ],
            album: null,
            genres: [],
          },
        },
      ];

      mockListenHistoryClient.findMany.mockResolvedValue(mockEntries);
      mockListenHistoryClient.count.mockResolvedValue(1);

      const result = await service.getListenHistory(userId, 2, 5);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockListenHistoryClient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result.items[0]).toEqual({
        id: 'lh-minimal',
        listenedAt: '2026-05-27T09:00:00.000Z',
        durationMs: 0,
        completed: true,
        track: {
          id: 'track-minimal',
          title: 'Standalone',
          trackNumber: 1,
          diskNumber: 1,
          duration: 180,
          listenedCount: 0,
          explicit: true,
          lyrics: null,
          visibility: 'private',
          albumId: 'album-missing',
          artists: [
            {
              id: 'artist-1',
              name: 'Solo Artist',
              description: null,
              isCommunity: true,
              verified: false,
              bannerId: null,
              avatarId: null,
              visibility: 'community',
              createdAt: '2026-05-01T00:00:00.000Z',
              updatedAt: '2026-05-01T00:00:00.000Z',
              deletedAt: '2026-05-04T00:00:00.000Z',
            },
          ],
          album: undefined,
          albumArt: null,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
          deletedAt: '2026-05-03T00:00:00.000Z',
        },
      });
    });

    it('formats albums without cover art and nullable release dates', async () => {
      const mockEntries = [
        {
          id: 'lh-no-cover',
          listenedAt: new Date('2026-05-27T10:00:00Z'),
          durationMs: 5000,
          completed: false,
          track: {
            id: 'track-2',
            title: 'No Cover',
            trackNumber: 2,
            diskNumber: 1,
            duration: 200,
            listenedCount: 1,
            explicit: false,
            lyrics: null,
            visibility: 'public',
            albumId: 'album-2',
            createdAt: new Date('2026-05-01T00:00:00Z'),
            updatedAt: new Date('2026-05-01T00:00:00Z'),
            deletedAt: null,
            artists: [],
            album: {
              id: 'album-2',
              name: 'Album Without Art',
              description: null,
              type: 'album',
              systemKind: 'none',
              totalTracks: 1,
              totalDuration: 200,
              releaseDate: null,
              libraryId: null,
              coverId: null,
              visibility: 'public',
              createdAt: new Date('2026-05-01T00:00:00Z'),
              updatedAt: new Date('2026-05-01T00:00:00Z'),
              deletedAt: new Date('2026-05-05T00:00:00Z'),
              cover: null,
            },
            genres: [],
          },
        },
      ];

      mockListenHistoryClient.findMany.mockResolvedValue(mockEntries);
      mockListenHistoryClient.count.mockResolvedValue(1);

      const result = await service.getListenHistory(userId, 1, 10);

      expect(result.items[0]?.track.album).toEqual({
        id: 'album-2',
        name: 'Album Without Art',
        description: null,
        type: 'album',
        systemKind: 'none',
        totalTracks: 1,
        totalDuration: 200,
        releaseDate: null,
        libraryId: null,
        coverId: null,
        visibility: 'public',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
        deletedAt: '2026-05-05T00:00:00.000Z',
        cover: null,
      });
      expect(result.items[0]?.track.albumArt).toBeNull();
    });
  });
});
