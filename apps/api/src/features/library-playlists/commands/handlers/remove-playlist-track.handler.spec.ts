import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemovePlaylistTrackCommand } from '../impl/remove-playlist-track.command';
import { RemovePlaylistTrackHandler } from './remove-playlist-track.handler';

describe('RemovePlaylistTrackHandler', () => {
  let handler: RemovePlaylistTrackHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';
  const mockTrackId = 'track-123';
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
        RemovePlaylistTrackHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<RemovePlaylistTrackHandler>(RemovePlaylistTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully remove a track from the playlist', async () => {
    const command = new RemovePlaylistTrackCommand(mockPlaylistId, mockTrackId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.removeTrackFromPlaylist.mockResolvedValue(undefined as any);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(playlistRepository.removeTrackFromPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockTrackId,
    );
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new RemovePlaylistTrackCommand(mockPlaylistId, mockTrackId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
    expect(playlistRepository.removeTrackFromPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new RemovePlaylistTrackCommand(mockPlaylistId, mockTrackId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.removeTrackFromPlaylist).not.toHaveBeenCalled();
  });
});
