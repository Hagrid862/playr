import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket, PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryPlaylistCoverCommand } from '../impl/delete-library-playlist-cover.command';
import { DeleteLibraryPlaylistCoverHandler } from './delete-library-playlist-cover.handler';

describe('DeleteLibraryPlaylistCoverHandler', () => {
  let handler: DeleteLibraryPlaylistCoverHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;
  let prismaService: DeepMocked<PrismaService>;
  let storageService: DeepMocked<StorageService>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';
  const mockLibrary = libraryBuilder({ id: 'lib-123', userId: mockUserId });

  const mockPlaylist = {
    id: mockPlaylistId,
    name: 'My Playlist',
    systemRole: null as PlaylistSystemRole | null,
    coverId: 'cover-123' as string | null,
    libraryId: 'lib-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    description: null,
    isPublic: false,
    isCollaborative: false,
    artistId: null,
  };

  const mockTx = {
    playlist: {
      update: vi.fn(),
    },
    image: {
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();
    storageService = createMock<StorageService>();
    prismaService = createMock<PrismaService>();

    (prismaService as any).client = {
      image: { findUnique: vi.fn() },
    };
    (prismaService as any).mainClient = {
      $transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryPlaylistCoverHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
        { provide: PrismaService, useValue: prismaService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    handler = module.get<DeleteLibraryPlaylistCoverHandler>(DeleteLibraryPlaylistCoverHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete playlist cover when it exists', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    (prismaService.client.image.findUnique as any).mockResolvedValue({
      bucket: 'public' as FileBucket,
      key: 'covers/file-123.jpg',
    });
    storageService.deleteFile.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result).toEqual({ id: mockPlaylistId, cover: undefined });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(prismaService.client.image.findUnique).toHaveBeenCalledWith({
      where: { id: 'cover-123' },
      select: { bucket: true, key: true },
    });
    expect(prismaService.mainClient.$transaction).toHaveBeenCalled();
    expect(mockTx.playlist.update).toHaveBeenCalledWith({
      where: { id: mockPlaylistId },
      data: { coverId: null },
    });
    expect(mockTx.image.delete).toHaveBeenCalledWith({
      where: { id: 'cover-123' },
    });
    expect(storageService.deleteFile).toHaveBeenCalledWith(
      'public' as FileBucket,
      'covers/file-123.jpg',
    );
  });

  it('should successfully complete when no cover is present', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);
    const playlistNoCover = {
      ...mockPlaylist,
      coverId: null,
    };

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(playlistNoCover);

    const result = await handler.execute(command);

    expect(result).toEqual({ id: mockPlaylistId, cover: undefined });
    expect(prismaService.client.image.findUnique).not.toHaveBeenCalled();
    expect(prismaService.mainClient.$transaction).not.toHaveBeenCalled();
  });

  it('should log an error but not throw when S3 cleanup fails', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    (prismaService.client.image.findUnique as any).mockResolvedValue({
      bucket: 'public' as FileBucket,
      key: 'covers/file-123.jpg',
    });
    storageService.deleteFile.mockRejectedValue(new Error('S3 delete failed'));

    // Spy on logger
    const loggerSpy = vi.spyOn((handler as any).logger, 'error');

    const result = await handler.execute(command);

    expect(result).toEqual({ id: mockPlaylistId, cover: undefined });
    // Allow macro-task/promise queue to run for the catch block
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to cleanup playlist cover file from S3: covers/file-123.jpg',
      expect.any(Error),
    );
  });

  it('should successfully complete even if the image metadata is not found in database', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    (prismaService.client.image.findUnique as any).mockResolvedValue(null);

    const result = await handler.execute(command);

    expect(result).toEqual({ id: mockPlaylistId, cover: undefined });
    expect(prismaService.client.image.findUnique).toHaveBeenCalledWith({
      where: { id: 'cover-123' },
      select: { bucket: true, key: true },
    });
    expect(prismaService.mainClient.$transaction).toHaveBeenCalled();
    expect(mockTx.playlist.update).toHaveBeenCalledWith({
      where: { id: mockPlaylistId },
      data: { coverId: null },
    });
    expect(mockTx.image.delete).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(prismaService.client.image.findUnique).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if playlist system role is favorites', async () => {
    const command = new DeleteLibraryPlaylistCoverCommand(mockPlaylistId, mockUserId);
    const favoritesPlaylist = {
      ...mockPlaylist,
      systemRole: PlaylistSystemRole.favorites,
    };

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(favoritesPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('Cannot change cover for the favorites playlist'),
    );
    expect(prismaService.client.image.findUnique).not.toHaveBeenCalled();
  });
});
