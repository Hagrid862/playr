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
import { SortPlaylistTracksCommand } from '../impl/sort-playlist-tracks.command';
import { SortPlaylistTracksHandler } from './sort-playlist-tracks.handler';

describe('SortPlaylistTracksHandler', () => {
  let handler: SortPlaylistTracksHandler;
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

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SortPlaylistTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<SortPlaylistTracksHandler>(SortPlaylistTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should sort playlist tracks ascending successfully', async () => {
    const command = new SortPlaylistTracksCommand(
      mockPlaylistId,
      { sort: 'addedAt_asc' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.sortPlaylistTracksByAddedAt.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(playlistRepository.sortPlaylistTracksByAddedAt).toHaveBeenCalledWith(
      mockPlaylistId,
      'asc',
    );
  });

  it('should sort playlist tracks descending successfully', async () => {
    const command = new SortPlaylistTracksCommand(
      mockPlaylistId,
      { sort: 'addedAt_desc' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.sortPlaylistTracksByAddedAt.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true });
    expect(playlistRepository.sortPlaylistTracksByAddedAt).toHaveBeenCalledWith(
      mockPlaylistId,
      'desc',
    );
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new SortPlaylistTracksCommand(
      mockPlaylistId,
      { sort: 'addedAt_asc' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new SortPlaylistTracksCommand(
      mockPlaylistId,
      { sort: 'addedAt_asc' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.sortPlaylistTracksByAddedAt).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if trying to sort the favorites playlist', async () => {
    const command = new SortPlaylistTracksCommand(
      mockPlaylistId,
      { sort: 'addedAt_asc' },
      mockUserId,
    );

    const favoritesPlaylist = { ...mockPlaylist, systemRole: PlaylistSystemRole.favorites };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(favoritesPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.sortPlaylistTracksByAddedAt).not.toHaveBeenCalled();
  });

  it('should fallback to exhaustive default if sort direction is invalid at runtime', async () => {
    const command = new SortPlaylistTracksCommand(
      mockPlaylistId,
      { sort: 'invalid' as any },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.sortPlaylistTracksByAddedAt.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true });
    expect(playlistRepository.sortPlaylistTracksByAddedAt).toHaveBeenCalledWith(
      mockPlaylistId,
      'invalid',
    );
  });
});
