import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket, PlaylistSystemRole } from '@repo/db';
import { libraryBuilder, imageBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadLibraryPlaylistCoverCommand } from '../impl/upload-library-playlist-cover.command';
import { UploadLibraryPlaylistCoverHandler } from './upload-library-playlist-cover.handler';

describe('UploadLibraryPlaylistCoverHandler', () => {
  let handler: UploadLibraryPlaylistCoverHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;
  let storageService: DeepMocked<StorageService>;
  let imageService: DeepMocked<ImageService>;
  let prismaService: DeepMocked<PrismaService>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';
  const mockBuffer = Buffer.from('test-image-content');
  const mockMimeType = 'image/png';

  const mockLibrary = libraryBuilder({ id: 'lib-123', userId: mockUserId });
  const mockPlaylist = {
    id: mockPlaylistId,
    name: 'My Playlist',
    systemRole: null as PlaylistSystemRole | null,
    coverId: null as string | null,
    libraryId: 'lib-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    description: null,
    isPublic: false,
    isCollaborative: false,
    artistId: null,
  };

  const mockImageRecord = imageBuilder({
    id: 'img-123',
    bucket: FileBucket.public,
    key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    url: 'http://bucket/cover.webp',
    mimeType: 'image/webp',
    uploadStatus: 'uploaded',
  });

  const mockTx = {
    image: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    playlist: {
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();
    storageService = createMock<StorageService>();
    imageService = createMock<ImageService>();
    prismaService = createMock<PrismaService>();

    storageService.deleteFile.mockResolvedValue(undefined);

    // DeepMocked<PrismaService> workaround to support mocked implementations
    (prismaService as any).client = {
      image: { findUnique: vi.fn() },
    };
    (prismaService as any).mainClient = {
      $transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadLibraryPlaylistCoverHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
        { provide: StorageService, useValue: storageService },
        { provide: ImageService, useValue: imageService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    handler = module.get<UploadLibraryPlaylistCoverHandler>(UploadLibraryPlaylistCoverHandler);

    vi.spyOn(Date, 'now').mockReturnValue(1704067200000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should upload playlist cover successfully without old cover', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    mockTx.image.create.mockResolvedValue(mockImageRecord);
    mockTx.playlist.update.mockResolvedValue({ ...mockPlaylist, coverId: mockImageRecord.id });

    const result = await handler.execute(command);

    expect(result.id).toBe('img-123');
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(imageService.validateImage).toHaveBeenCalledWith(mockBuffer, 50);
    expect(imageService.resizeToMaxDimension).toHaveBeenCalledWith(mockBuffer, 1024, 80, 'webp');
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      FileBucket.public,
      `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
      { contentType: 'image/webp' },
    );
    expect(mockTx.image.create).toHaveBeenCalledWith({
      data: {
        bucket: FileBucket.public,
        key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
        url: 'http://bucket/cover.webp',
        mimeType: 'image/webp',
        uploadStatus: 'uploaded',
      },
    });
    expect(mockTx.playlist.update).toHaveBeenCalledWith({
      where: { id: mockPlaylistId },
      data: { coverId: mockImageRecord.id },
    });
    expect(mockTx.image.deleteMany).not.toHaveBeenCalled();
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('should upload playlist cover and cleanup old cover successfully', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    const playlistWithCover = { ...mockPlaylist, coverId: 'old-img-123' };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(playlistWithCover);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    vi.mocked((prismaService as any).client.image.findUnique).mockResolvedValue({
      id: 'old-img-123',
      bucket: FileBucket.public,
      key: 'old-cover.webp',
    } as any);

    mockTx.image.create.mockResolvedValue(mockImageRecord);
    mockTx.playlist.update.mockResolvedValue({ ...mockPlaylist, coverId: mockImageRecord.id });

    const result = await handler.execute(command);

    expect(result.id).toBe('img-123');
    expect((prismaService as any).client.image.findUnique).toHaveBeenCalledWith({
      where: { id: 'old-img-123' },
      select: { bucket: true, key: true },
    });
    expect(mockTx.image.deleteMany).toHaveBeenCalledWith({
      where: { id: 'old-img-123' },
    });

    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, 'old-cover.webp');
  });

  it('should upload successfully even if old cover is orphaned (exists in playlist but missing in image table)', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    const playlistWithCover = { ...mockPlaylist, coverId: 'old-img-123' };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(playlistWithCover);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    vi.mocked((prismaService as any).client.image.findUnique).mockResolvedValue(null);

    mockTx.image.create.mockResolvedValue(mockImageRecord);
    mockTx.playlist.update.mockResolvedValue({ ...mockPlaylist, coverId: mockImageRecord.id });

    const result = await handler.execute(command);

    expect(result.id).toBe('img-123');
    expect(mockTx.image.deleteMany).toHaveBeenCalledWith({
      where: { id: 'old-img-123' },
    });
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('should log error if old cover file cleanup on S3 fails', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    const playlistWithCover = { ...mockPlaylist, coverId: 'old-img-123' };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(playlistWithCover);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    vi.mocked((prismaService as any).client.image.findUnique).mockResolvedValue({
      id: 'old-img-123',
      bucket: FileBucket.public,
      key: 'old-cover.webp',
    } as any);

    mockTx.image.create.mockResolvedValue(mockImageRecord);
    mockTx.playlist.update.mockResolvedValue({ ...mockPlaylist, coverId: mockImageRecord.id });

    const loggerSpy = vi.spyOn((handler as any).logger, 'error').mockImplementation(() => {});
    storageService.deleteFile.mockRejectedValue(new Error('S3 Delete Failed'));

    const result = await handler.execute(command);

    expect(result.id).toBe('img-123');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup old playlist cover file'),
      expect.any(Error),
    );
  });

  it('should throw PreconditionFailedException if user library not found', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist not found', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if trying to change cover for favorites playlist', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    const favoritesPlaylist = { ...mockPlaylist, systemRole: PlaylistSystemRole.favorites };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(favoritesPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if image is invalid', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    imageService.validateImage.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw InternalServerErrorException if uploaded image record parsing fails', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    // Provide invalid image record for schema parsing
    mockTx.image.create.mockResolvedValue({
      id: 'img-123',
      // Missing other required fields to trigger schema parsing failure
    });

    const expectedNewKey = `playlists/${mockPlaylistId}/cover-1704067200000.webp`;

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);

    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });

  it('should cleanup new cover file and rethrow if transaction fails', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    vi.mocked((prismaService as any).mainClient.$transaction).mockRejectedValue(
      new Error('Transaction DB Error'),
    );

    const expectedNewKey = `playlists/${mockPlaylistId}/cover-1704067200000.webp`;

    await expect(handler.execute(command)).rejects.toThrow('Transaction DB Error');

    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });

  it('should log error if cleanup of new cover file fails after transaction error', async () => {
    const command = new UploadLibraryPlaylistCoverCommand(
      mockPlaylistId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed-image'));
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/cover.webp',
      key: `playlists/${mockPlaylistId}/cover-1704067200000.webp`,
    });

    vi.mocked((prismaService as any).mainClient.$transaction).mockRejectedValue(
      new Error('Transaction DB Error'),
    );

    const loggerSpy = vi.spyOn((handler as any).logger, 'error').mockImplementation(() => {});
    storageService.deleteFile.mockRejectedValue(new Error('S3 Delete Failed'));

    await expect(handler.execute(command)).rejects.toThrow('Transaction DB Error');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to cleanup new playlist cover file after transaction failure',
      ),
      expect.any(Error),
    );
  });
});
