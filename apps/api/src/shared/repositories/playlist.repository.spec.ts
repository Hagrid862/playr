import { ConflictException } from '@nestjs/common';
import type { PlaylistTrackSort } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { PlaylistRepository } from './playlist.repository';

describe('PlaylistRepository', () => {
  let prisma: DeepMocked<PrismaService>;
  let repository: PlaylistRepository;

  beforeEach(() => {
    prisma = createMock<PrismaService>();
    prisma.mainClient.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prisma.client);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return undefined;
    });
    repository = new PlaylistRepository(prisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findActiveLibraryPlaylist', () => {
    it('returns active playlist for library', async () => {
      const row = { id: 'pl-1', libraryId: 'lib-1', deletedAt: null };
      prisma.client.playlist.findFirst.mockResolvedValue(row as never);

      const result = await repository.findActiveLibraryPlaylist('pl-1', 'lib-1');

      expect(prisma.client.playlist.findFirst).toHaveBeenCalledWith({
        where: { id: 'pl-1', libraryId: 'lib-1', deletedAt: null },
      });
      expect(result).toEqual(row);
    });
  });

  describe('findFavoritesPlaylist', () => {
    it('returns favorites system playlist', async () => {
      const row = { id: 'fav-1', libraryId: 'lib-1', systemRole: PlaylistSystemRole.favorites };
      prisma.client.playlist.findFirst.mockResolvedValue(row as never);

      const result = await repository.findFavoritesPlaylist('lib-1');

      expect(prisma.client.playlist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-1',
          systemRole: PlaylistSystemRole.favorites,
          deletedAt: null,
        },
      });
      expect(result).toEqual(row);
    });
  });

  describe('countActiveTracks', () => {
    it('counts non-deleted playlist tracks', async () => {
      prisma.client.playlistTrack.count.mockResolvedValue(3);

      const result = await repository.countActiveTracks('pl-1');

      expect(prisma.client.playlistTrack.count).toHaveBeenCalledWith({
        where: { playlistId: 'pl-1', deletedAt: null },
      });
      expect(result).toBe(3);
    });
  });

  describe('listLibraryPlaylistsWithCover', () => {
    it('lists playlists with cover and active track count', async () => {
      const rows = [{ id: 'pl-1', cover: null, _count: { tracks: 2 } }];
      prisma.client.playlist.findMany.mockResolvedValue(rows as never);

      const result = await repository.listLibraryPlaylistsWithCover('lib-1');

      expect(prisma.client.playlist.findMany).toHaveBeenCalledWith({
        where: { libraryId: 'lib-1', deletedAt: null },
        include: {
          cover: true,
          _count: {
            select: {
              tracks: { where: { deletedAt: null } },
            },
          },
        },
      });
      expect(result).toEqual(rows);
    });
  });

  describe('listActivePinsForLibrary', () => {
    it('lists active pins with playlist cover', async () => {
      const rows = [{ id: 'pin-1', playlist: { id: 'pl-1', cover: null } }];
      prisma.client.playlistSidebarPin.findMany.mockResolvedValue(rows as never);

      const result = await repository.listActivePinsForLibrary('lib-1');

      expect(prisma.client.playlistSidebarPin.findMany).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-1',
          deletedAt: null,
          playlist: { deletedAt: null },
        },
        orderBy: { order: 'asc' },
        include: {
          playlist: { include: { cover: true } },
        },
      });
      expect(result).toEqual(rows);
    });
  });

  describe('findActivePinById', () => {
    it('finds active pin by id and library', async () => {
      const row = { id: 'pin-1', libraryId: 'lib-1', deletedAt: null };
      prisma.client.playlistSidebarPin.findFirst.mockResolvedValue(row as never);

      const result = await repository.findActivePinById('pin-1', 'lib-1');

      expect(prisma.client.playlistSidebarPin.findFirst).toHaveBeenCalledWith({
        where: { id: 'pin-1', libraryId: 'lib-1', deletedAt: null },
      });
      expect(result).toEqual(row);
    });
  });

  describe('findActivePinByPlaylist', () => {
    it('finds active pin for library and playlist', async () => {
      const row = { id: 'pin-1', libraryId: 'lib-1', playlistId: 'pl-1', deletedAt: null };
      prisma.client.playlistSidebarPin.findFirst.mockResolvedValue(row as never);

      const result = await repository.findActivePinByPlaylist('lib-1', 'pl-1');

      expect(prisma.client.playlistSidebarPin.findFirst).toHaveBeenCalledWith({
        where: { libraryId: 'lib-1', playlistId: 'pl-1', deletedAt: null },
      });
      expect(result).toEqual(row);
    });
  });

  describe('createUserPlaylist', () => {
    it('creates user playlist connected to library', async () => {
      const created = { id: 'pl-new', name: 'Road Trip', libraryId: 'lib-1' };
      prisma.client.playlist.create.mockResolvedValue(created as never);

      const result = await repository.createUserPlaylist('lib-1', 'Road Trip');

      expect(prisma.client.playlist.create).toHaveBeenCalledWith({
        data: {
          name: 'Road Trip',
          library: { connect: { id: 'lib-1' } },
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('updatePlaylistName', () => {
    it('updates playlist name', async () => {
      const updated = { id: 'pl-1', name: 'Renamed' };
      prisma.client.playlist.update.mockResolvedValue(updated as never);

      const result = await repository.updatePlaylistName('pl-1', 'Renamed');

      expect(prisma.client.playlist.update).toHaveBeenCalledWith({
        where: { id: 'pl-1' },
        data: { name: 'Renamed' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('softDeletePlaylist', () => {
    it('soft-deletes playlist', async () => {
      const deleted = { id: 'pl-1', deletedAt: new Date('2024-06-01') };
      prisma.client.playlist.update.mockResolvedValue(deleted as never);

      const result = await repository.softDeletePlaylist('pl-1');

      expect(prisma.client.playlist.update).toHaveBeenCalledWith({
        where: { id: 'pl-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual(deleted);
    });
  });

  describe('getPlaylistDetailPage', () => {
    const playlist = { id: 'pl-1', libraryId: 'lib-1', cover: null };
    const trackRows = [{ trackId: 't-1', track: { id: 't-1' } }];

    it('returns null when playlist is missing', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue(null);

      const result = await repository.getPlaylistDetailPage('pl-1', 'lib-1', 1, 10, 'order');

      expect(result).toBeNull();
      expect(prisma.client.playlistTrack.findMany).not.toHaveBeenCalled();
    });

    it.each([
      ['order', { order: 'asc' }],
      ['addedAt_asc', [{ addedAt: 'asc' }, { trackId: 'asc' }]],
      ['addedAt_desc', [{ addedAt: 'desc' }, { trackId: 'desc' }]],
    ] as const satisfies ReadonlyArray<[PlaylistTrackSort, unknown]>)(
      'loads paginated tracks sorted by %s',
      async (sort, orderBy) => {
        prisma.client.playlist.findFirst.mockResolvedValue(playlist as never);
        prisma.client.playlistTrack.count.mockResolvedValue(5);
        prisma.client.playlistTrack.findMany.mockResolvedValue(trackRows as never);

        const result = await repository.getPlaylistDetailPage('pl-1', 'lib-1', 2, 10, sort);

        expect(prisma.client.playlistTrack.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { playlistId: 'pl-1', deletedAt: null },
            orderBy,
            skip: 10,
            take: 10,
          }),
        );
        expect(result).toEqual({
          playlist,
          trackRows,
          totalTracks: 5,
        });
      },
    );

    it('always sorts favorites by addedAt descending regardless of requested sort', async () => {
      const favoritesPlaylist = {
        ...playlist,
        systemRole: PlaylistSystemRole.favorites,
      };
      prisma.client.playlist.findFirst.mockResolvedValue(favoritesPlaylist as never);
      prisma.client.playlistTrack.count.mockResolvedValue(3);
      prisma.client.playlistTrack.findMany.mockResolvedValue(trackRows as never);

      await repository.getPlaylistDetailPage('pl-1', 'lib-1', 1, 10, 'order');

      expect(prisma.client.playlistTrack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ addedAt: 'desc' }, { trackId: 'desc' }],
        }),
      );
    });

    it('falls through exhaustive default for unknown sort at runtime', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue(playlist as never);
      prisma.client.playlistTrack.count.mockResolvedValue(0);
      prisma.client.playlistTrack.findMany.mockResolvedValue([] as never);

      await repository.getPlaylistDetailPage(
        'pl-1',
        'lib-1',
        1,
        10,
        'unsupported' as PlaylistTrackSort,
      );

      expect(prisma.client.playlistTrack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'unsupported',
        }),
      );
    });
  });

  describe('addTrackToPlaylist', () => {
    it('creates a new playlist track when none exists', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue(null);
      prisma.client.playlistTrack.aggregate.mockResolvedValue({ _max: { order: 1 } } as never);
      prisma.client.playlistTrack.create.mockResolvedValue({} as never);

      await repository.addTrackToPlaylist('pl-1', 't-new');

      expect(prisma.client.playlistTrack.create).toHaveBeenCalledWith({
        data: {
          playlistId: 'pl-1',
          trackId: 't-new',
          order: 2,
          addedAt: expect.any(Date),
        },
      });
    });

    it('restores soft-deleted track with next order', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue({
        id: 'pt-1',
        deletedAt: new Date('2020-01-01'),
      } as never);
      prisma.client.playlistTrack.aggregate.mockResolvedValue({ _max: { order: null } } as never);
      prisma.client.playlistTrack.update.mockResolvedValue({} as never);

      await repository.addTrackToPlaylist('pl-1', 't-1');

      expect(prisma.client.playlistTrack.update).toHaveBeenCalledWith({
        where: { id: 'pt-1' },
        data: { deletedAt: null, order: 0, addedAt: expect.any(Date) },
      });
      expect(prisma.client.playlistTrack.create).not.toHaveBeenCalled();
    });

    it('no-ops when track is already active', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue({
        id: 'pt-1',
        deletedAt: null,
      } as never);
      prisma.client.playlistTrack.aggregate.mockResolvedValue({ _max: { order: 0 } } as never);

      await repository.addTrackToPlaylist('pl-1', 't-1');

      expect(prisma.client.playlistTrack.update).not.toHaveBeenCalled();
      expect(prisma.client.playlistTrack.create).not.toHaveBeenCalled();
    });
  });

  describe('addTracksToPlaylist', () => {
    it('creates, restores, and skips tracks inside a transaction', async () => {
      prisma.client.playlistTrack.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'pt-deleted',
          deletedAt: new Date('2020-01-01'),
        } as never)
        .mockResolvedValueOnce({
          id: 'pt-active',
          deletedAt: null,
        } as never);
      prisma.client.playlistTrack.aggregate.mockResolvedValue({ _max: { order: 0 } } as never);
      prisma.client.playlistTrack.create.mockResolvedValue({} as never);
      prisma.client.playlistTrack.update.mockResolvedValue({} as never);

      const result = await repository.addTracksToPlaylist('pl-1', ['t-new', 't-restore', 't-skip']);

      expect(result).toEqual({ addedCount: 2 });
      expect(prisma.client.playlistTrack.create).toHaveBeenCalledTimes(1);
      expect(prisma.client.playlistTrack.update).toHaveBeenCalledTimes(1);
    });

    it('uses order 0 when playlist has no existing max order', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue(null);
      prisma.client.playlistTrack.aggregate.mockResolvedValue({ _max: { order: null } } as never);
      prisma.client.playlistTrack.create.mockResolvedValue({} as never);

      const result = await repository.addTracksToPlaylist('pl-1', ['t-new']);

      expect(result).toEqual({ addedCount: 1 });
      expect(prisma.client.playlistTrack.create).toHaveBeenCalledWith({
        data: {
          playlistId: 'pl-1',
          trackId: 't-new',
          order: 0,
          addedAt: expect.any(Date),
        },
      });
    });
  });

  describe('removeTrackFromPlaylist', () => {
    it('no-ops when row is missing', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue(null);

      await repository.removeTrackFromPlaylist('pl-1', 't-1');

      expect(prisma.client.playlistTrack.update).not.toHaveBeenCalled();
    });

    it('no-ops when row is already soft-deleted', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue({
        id: 'pt-1',
        deletedAt: new Date('2020-01-01'),
      } as never);

      await repository.removeTrackFromPlaylist('pl-1', 't-1');

      expect(prisma.client.playlistTrack.update).not.toHaveBeenCalled();
    });

    it('soft-deletes active playlist track', async () => {
      prisma.client.playlistTrack.findUnique.mockResolvedValue({
        id: 'pt-1',
        deletedAt: null,
      } as never);
      prisma.client.playlistTrack.update.mockResolvedValue({} as never);

      await repository.removeTrackFromPlaylist('pl-1', 't-1');

      expect(prisma.client.playlistTrack.update).toHaveBeenCalledWith({
        where: { id: 'pt-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('isTrackInFavoritesPlaylist', () => {
    it('returns false when favorites playlist does not exist', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue(null);

      const result = await repository.isTrackInFavoritesPlaylist('lib-1', 't-1');

      expect(result).toBe(false);
      expect(prisma.client.playlistTrack.findFirst).not.toHaveBeenCalled();
    });

    it('returns true when track is in favorites', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue({ id: 'fav-1' } as never);
      prisma.client.playlistTrack.findFirst.mockResolvedValue({ id: 'pt-1' } as never);

      const result = await repository.isTrackInFavoritesPlaylist('lib-1', 't-1');

      expect(result).toBe(true);
    });

    it('returns false when track is not in favorites', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue({ id: 'fav-1' } as never);
      prisma.client.playlistTrack.findFirst.mockResolvedValue(null);

      const result = await repository.isTrackInFavoritesPlaylist('lib-1', 't-1');

      expect(result).toBe(false);
    });
  });

  describe('setFavoritesMembership', () => {
    it('no-ops when favorites playlist is missing', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue(null);

      await repository.setFavoritesMembership('lib-1', 't-1', true);

      expect(prisma.client.playlistTrack.findUnique).not.toHaveBeenCalled();
    });

    it('adds track when favorited', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue({ id: 'fav-1' } as never);
      prisma.client.playlistTrack.findUnique.mockResolvedValue(null);
      prisma.client.playlistTrack.aggregate.mockResolvedValue({ _max: { order: 0 } } as never);
      prisma.client.playlistTrack.create.mockResolvedValue({} as never);

      await repository.setFavoritesMembership('lib-1', 't-1', true);

      expect(prisma.client.playlistTrack.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playlistId: 'fav-1',
            trackId: 't-1',
          }),
        }),
      );
    });

    it('removes track when unfavorited', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue({ id: 'fav-1' } as never);
      prisma.client.playlistTrack.findUnique.mockResolvedValue({
        id: 'pt-1',
        deletedAt: null,
      } as never);
      prisma.client.playlistTrack.update.mockResolvedValue({} as never);

      await repository.setFavoritesMembership('lib-1', 't-1', false);

      expect(prisma.client.playlistTrack.update).toHaveBeenCalledWith({
        where: { id: 'pt-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('createPin', () => {
    it('creates sidebar pin', async () => {
      const created = { id: 'pin-1', libraryId: 'lib-1', playlistId: 'pl-1', order: 0 };
      prisma.client.playlistSidebarPin.create.mockResolvedValue(created as never);

      const result = await repository.createPin('lib-1', 'pl-1', 0);

      expect(prisma.client.playlistSidebarPin.create).toHaveBeenCalledWith({
        data: { libraryId: 'lib-1', playlistId: 'pl-1', order: 0 },
      });
      expect(result).toEqual(created);
    });
  });

  describe('maxPinOrder', () => {
    it('returns max order when pins exist', async () => {
      prisma.client.playlistSidebarPin.aggregate.mockResolvedValue({
        _max: { order: 3 },
      } as never);

      const result = await repository.maxPinOrder('lib-1');

      expect(result).toBe(3);
    });

    it('returns -1 when no pins exist', async () => {
      prisma.client.playlistSidebarPin.aggregate.mockResolvedValue({
        _max: { order: null },
      } as never);

      const result = await repository.maxPinOrder('lib-1');

      expect(result).toBe(-1);
    });
  });

  describe('softDeletePin', () => {
    it('soft-deletes pin', async () => {
      const deleted = { id: 'pin-1', deletedAt: new Date('2024-06-01') };
      prisma.client.playlistSidebarPin.update.mockResolvedValue(deleted as never);

      const result = await repository.softDeletePin('pin-1');

      expect(prisma.client.playlistSidebarPin.update).toHaveBeenCalledWith({
        where: { id: 'pin-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual(deleted);
    });
  });

  describe('reorderPins', () => {
    it('runs updateMany per pin in a transaction', async () => {
      const updates: unknown[] = [];
      prisma.mainClient.$transaction.mockImplementation(async (ops: unknown) => {
        if (Array.isArray(ops)) {
          for (const op of ops) {
            updates.push(op);
          }
        }
        return undefined;
      });

      await repository.reorderPins('lib-1', ['pin-b', 'pin-a']);

      expect(prisma.mainClient.$transaction).toHaveBeenCalledTimes(1);
      expect(updates).toHaveLength(2);
    });
  });

  describe('listActiveTrackIdsOrdered', () => {
    it('returns active track ids in order', async () => {
      prisma.client.playlistTrack.findMany.mockResolvedValue([
        { trackId: 't-1' },
        { trackId: 't-2' },
      ] as never);

      const result = await repository.listActiveTrackIdsOrdered('pl-1');

      expect(prisma.client.playlistTrack.findMany).toHaveBeenCalledWith({
        where: { playlistId: 'pl-1', deletedAt: null },
        orderBy: { order: 'asc' },
        select: { trackId: true },
      });
      expect(result).toEqual(['t-1', 't-2']);
    });
  });

  describe('pinPlaylist', () => {
    it('restores a soft-deleted pin and does not create a new row', async () => {
      const softDeleted = {
        id: 'pin-1',
        libraryId: 'lib-1',
        playlistId: 'pl-1',
        order: 0,
        deletedAt: new Date('2020-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const restored = { ...softDeleted, deletedAt: null, order: 2 };

      prisma.client.playlistSidebarPin.findFirst.mockResolvedValue(softDeleted as never);
      prisma.client.playlistSidebarPin.update.mockResolvedValue(restored as never);

      const result = await repository.pinPlaylist('lib-1', 'pl-1', 2);

      expect(prisma.client.playlistSidebarPin.create).not.toHaveBeenCalled();
      expect(prisma.client.playlistSidebarPin.update).toHaveBeenCalledWith({
        where: { id: 'pin-1' },
        data: { deletedAt: null, order: 2 },
      });
      expect(result).toEqual(restored);
    });

    it('creates a pin when no row exists for the pair', async () => {
      const created = {
        id: 'pin-new',
        libraryId: 'lib-1',
        playlistId: 'pl-1',
        order: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.client.playlistSidebarPin.findFirst.mockResolvedValue(null);
      prisma.client.playlistSidebarPin.create.mockResolvedValue(created as never);

      const result = await repository.pinPlaylist('lib-1', 'pl-1', 0);

      expect(prisma.client.playlistSidebarPin.update).not.toHaveBeenCalled();
      expect(prisma.client.playlistSidebarPin.create).toHaveBeenCalledWith({
        data: {
          libraryId: 'lib-1',
          playlistId: 'pl-1',
          order: 0,
        },
      });
      expect(result).toEqual(created);
    });

    it('throws ConflictException when an active pin row already exists', async () => {
      prisma.client.playlistSidebarPin.findFirst.mockResolvedValue({
        id: 'pin-1',
        libraryId: 'lib-1',
        playlistId: 'pl-1',
        order: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(repository.pinPlaylist('lib-1', 'pl-1', 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.client.playlistSidebarPin.create).not.toHaveBeenCalled();
      expect(prisma.client.playlistSidebarPin.update).not.toHaveBeenCalled();
    });
  });

  describe('getByNameForLibrary', () => {
    it('finds user playlist by exact name', async () => {
      const row = { id: 'p1', name: 'Mix', libraryId: 'lib-1', systemRole: null } as never;
      prisma.client.playlist.findFirst.mockResolvedValue(row);

      const result = await repository.getByNameForLibrary('lib-1', 'Mix');

      expect(prisma.client.playlist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-1',
          deletedAt: null,
          name: 'Mix',
          systemRole: null,
        },
      });
      expect(result).toEqual(row);
    });

    it('excludes playlist id when provided', async () => {
      prisma.client.playlist.findFirst.mockResolvedValue(null);

      await repository.getByNameForLibrary('lib-1', 'Mix', { excludePlaylistId: 'self-id' });

      expect(prisma.client.playlist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-1',
          deletedAt: null,
          name: 'Mix',
          systemRole: null,
          id: { not: 'self-id' },
        },
      });
    });
  });

  describe('reorderPlaylistTracks', () => {
    it('runs updateMany per track in a transaction', async () => {
      const updates: unknown[] = [];
      prisma.mainClient.$transaction.mockImplementation(async (ops: unknown) => {
        if (Array.isArray(ops)) {
          for (const op of ops) {
            updates.push(op);
          }
        }
        return undefined;
      });

      await repository.reorderPlaylistTracks('pl-1', ['t-b', 't-a']);

      expect(prisma.mainClient.$transaction).toHaveBeenCalledTimes(1);
      expect(updates).toHaveLength(2);
    });
  });

  describe('sortPlaylistTracksByAddedAt', () => {
    it('loads track ids by addedAt and reorders via transaction', async () => {
      prisma.client.playlistTrack.findMany.mockResolvedValue([
        { trackId: 't-oldest' },
        { trackId: 't-newest' },
      ] as never);

      const updates: unknown[] = [];
      prisma.mainClient.$transaction.mockImplementation(async (ops: unknown) => {
        if (Array.isArray(ops)) {
          for (const op of ops) {
            updates.push(op);
          }
        }
        return undefined;
      });

      await repository.sortPlaylistTracksByAddedAt('pl-1', 'asc');

      expect(prisma.client.playlistTrack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { playlistId: 'pl-1', deletedAt: null },
          orderBy: [{ addedAt: 'asc' }, { trackId: 'asc' }],
          select: { trackId: true },
        }),
      );
      expect(prisma.mainClient.$transaction).toHaveBeenCalledTimes(1);
      expect(updates).toHaveLength(2);
    });

    it('does not call transaction when playlist has no tracks', async () => {
      prisma.client.playlistTrack.findMany.mockResolvedValue([]);

      await repository.sortPlaylistTracksByAddedAt('pl-1', 'desc');

      expect(prisma.mainClient.$transaction).not.toHaveBeenCalled();
    });
  });
});
