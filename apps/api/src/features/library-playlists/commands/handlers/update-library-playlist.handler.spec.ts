import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryPlaylistCommand } from '../impl/update-library-playlist.command';
import { UpdateLibraryPlaylistHandler } from './update-library-playlist.handler';

describe('UpdateLibraryPlaylistHandler', () => {
  let handler: UpdateLibraryPlaylistHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';
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

  const mockPlaylistWithCover = {
    ...mockPlaylist,
    cover: { id: 'img-123', url: 'http://bucket/cover.jpg' },
    _count: { tracks: 5 },
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryPlaylistHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<UpdateLibraryPlaylistHandler>(UpdateLibraryPlaylistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should rename playlist successfully when name is changed and is pinned', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'New Playlist Name' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.getByNameForLibrary.mockResolvedValue(null);
    playlistRepository.updatePlaylistName.mockResolvedValue({
      ...mockPlaylist,
      name: 'New Playlist Name',
    });
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { ...mockPlaylistWithCover, name: 'New Playlist Name' } as any,
    ]);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([
      {
        id: 'pin-123',
        playlistId: mockPlaylistId,
        order: 2,
      } as any,
    ]);

    const result = await handler.execute(command);

    expect(result).toEqual({
      id: mockPlaylistId,
      name: 'New Playlist Name',
      systemRole: null,
      cover: mockPlaylistWithCover.cover,
      trackCount: 5,
      pinned: true,
      pinOrder: 2,
      pinId: 'pin-123',
    });

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(playlistRepository.getByNameForLibrary).toHaveBeenCalledWith(
      mockLibrary.id,
      'New Playlist Name',
      { excludePlaylistId: mockPlaylistId },
    );
    expect(playlistRepository.updatePlaylistName).toHaveBeenCalledWith(
      mockPlaylistId,
      'New Playlist Name',
    );
  });

  it('should update playlist successfully when name is not changed and is not pinned', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'My Playlist' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.updatePlaylistName.mockResolvedValue(mockPlaylist);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { ...mockPlaylistWithCover, cover: null } as any,
    ]);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([]);

    const result = await handler.execute(command);

    expect(result).toEqual({
      id: mockPlaylistId,
      name: 'My Playlist',
      systemRole: null,
      cover: undefined,
      trackCount: 5,
      pinned: false,
      pinOrder: null,
      pinId: null,
    });

    expect(playlistRepository.getByNameForLibrary).not.toHaveBeenCalled();
    expect(playlistRepository.updatePlaylistName).toHaveBeenCalledWith(
      mockPlaylistId,
      'My Playlist',
    );
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'New Name' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'New Name' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.updatePlaylistName).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if trying to rename the favorites playlist', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'New Name' },
      mockUserId,
    );

    const favoritesPlaylist = { ...mockPlaylist, systemRole: PlaylistSystemRole.favorites };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(favoritesPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.updatePlaylistName).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if trimmed name is empty', async () => {
    const command = new UpdateLibraryPlaylistCommand(mockPlaylistId, { name: '   ' }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.updatePlaylistName).not.toHaveBeenCalled();
  });

  it('should throw ConflictException if new name is already taken', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'Taken Name' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.getByNameForLibrary.mockResolvedValue({ id: 'playlist-different' } as any);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(playlistRepository.updatePlaylistName).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if the updated playlist is missing from the list loaded from database', async () => {
    const command = new UpdateLibraryPlaylistCommand(
      mockPlaylistId,
      { name: 'My Playlist' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.updatePlaylistName.mockResolvedValue(mockPlaylist);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([]);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([]);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
