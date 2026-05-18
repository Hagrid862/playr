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
});
