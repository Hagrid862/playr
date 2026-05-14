import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumType, AlbumSystemKind, Visibility } from '@repo/db';
import { albumBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryAlbumCommand } from '../impl/delete-library-album.command';
import { DeleteLibraryAlbumHandler } from './delete-library-album.handler';

describe('DeleteLibraryAlbumHandler', () => {
  let handler: DeleteLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockAlbum = albumBuilder({
    id: mockAlbumId,
    name: 'Test Album',
    description: 'Test Description',
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: Visibility.public,
    systemKind: AlbumSystemKind.none,
  });

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();
    libraryRepository = createMock<LibraryRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryAlbumHandler,
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
      ],
    }).compile();

    handler = module.get<DeleteLibraryAlbumHandler>(DeleteLibraryAlbumHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should soft-delete album and tracks when keepTracks is false', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId, false);
    const mockDeletedAlbum = { ...mockAlbum, deletedAt: new Date() };

    albumRepository.getByIdForAlbumOwner.mockResolvedValue(mockAlbum);
    albumRepository.softDeleteCascade.mockResolvedValue(mockDeletedAlbum);

    const result = await handler.execute(command);

    expect(result).toEqual(mockDeletedAlbum);
    expect(albumRepository.softDeleteCascade).toHaveBeenCalledWith(mockAlbumId);
    expect(albumRepository.softDeleteAlbumReassignTracksToUnknownBucket).not.toHaveBeenCalled();
    expect(libraryRepository.getByUserId).not.toHaveBeenCalled();
  });

  it('should reassign tracks when keepTracks is true', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId, true);
    const mockDeletedAlbum = { ...mockAlbum, deletedAt: new Date() };

    albumRepository.getByIdForAlbumOwner.mockResolvedValue(mockAlbum);
    libraryRepository.getByUserId.mockResolvedValue({ id: 'library-1', userId: mockUserId } as any);
    albumRepository.softDeleteAlbumReassignTracksToUnknownBucket.mockResolvedValue(
      mockDeletedAlbum,
    );

    const result = await handler.execute(command);

    expect(result).toEqual(mockDeletedAlbum);
    expect(albumRepository.softDeleteAlbumReassignTracksToUnknownBucket).toHaveBeenCalledWith({
      userId: mockUserId,
      libraryId: 'library-1',
      sourceAlbumId: mockAlbumId,
    });
    expect(albumRepository.softDeleteCascade).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when keepTracks on unknown_bucket album', async () => {
    const unknownAlbum = albumBuilder({
      id: mockAlbumId,
      systemKind: AlbumSystemKind.unknown_bucket,
    });
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId, true);
    albumRepository.getByIdForAlbumOwner.mockResolvedValue(unknownAlbum);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(albumRepository.softDeleteAlbumReassignTracksToUnknownBucket).not.toHaveBeenCalled();
  });

  it('should throw PreconditionFailedException when keepTracks and no library', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId, true);
    albumRepository.getByIdForAlbumOwner.mockResolvedValue(mockAlbum);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw NotFoundException if album is missing or permission denied', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId, false);
    albumRepository.getByIdForAlbumOwner.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId, false);
    albumRepository.getByIdForAlbumOwner.mockResolvedValue(mockAlbum);
    albumRepository.softDeleteCascade.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
