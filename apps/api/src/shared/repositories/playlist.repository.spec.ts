import { ConflictException } from '@nestjs/common';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { PlaylistRepository } from './playlist.repository';

describe('PlaylistRepository', () => {
  let prisma: DeepMocked<PrismaService>;
  let repository: PlaylistRepository;

  beforeEach(() => {
    prisma = createMock<PrismaService>();
    repository = new PlaylistRepository(prisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
