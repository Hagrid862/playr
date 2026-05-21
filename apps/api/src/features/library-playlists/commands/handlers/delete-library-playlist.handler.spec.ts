import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryPlaylistCommand } from '../impl/delete-library-playlist.command';
import { DeleteLibraryPlaylistHandler } from './delete-library-playlist.handler';

describe('DeleteLibraryPlaylistHandler', () => {
  let handler: DeleteLibraryPlaylistHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';
  const mockLibrary = libraryBuilder({ id: 'lib-123', userId: mockUserId });

  const mockPlaylist = {
    id: mockPlaylistId,
    name: 'My Playlist',
    systemRole: null as PlaylistSystemRole | null,
    libraryId: 'lib-123',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: null,
    isPublic: false,
    isCollaborative: false,
    artistId: null,
    coverId: null,
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryPlaylistHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<DeleteLibraryPlaylistHandler>(DeleteLibraryPlaylistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete a library playlist', async () => {
    const command = new DeleteLibraryPlaylistCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.softDeletePlaylist.mockResolvedValue(undefined as any);

    const result = await handler.execute(command);

    expect(result).toEqual({ id: mockPlaylistId });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(playlistRepository.softDeletePlaylist).toHaveBeenCalledWith(mockPlaylistId);
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new DeleteLibraryPlaylistCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
    expect(playlistRepository.softDeletePlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new DeleteLibraryPlaylistCommand(mockPlaylistId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.softDeletePlaylist).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if playlist system role is favorites', async () => {
    const command = new DeleteLibraryPlaylistCommand(mockPlaylistId, mockUserId);
    const favoritesPlaylist = {
      ...mockPlaylist,
      systemRole: PlaylistSystemRole.favorites,
    };

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(favoritesPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('Cannot delete the favorites playlist'),
    );
    expect(playlistRepository.softDeletePlaylist).not.toHaveBeenCalled();
  });
});
