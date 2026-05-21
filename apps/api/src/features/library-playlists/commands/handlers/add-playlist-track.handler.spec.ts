import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
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
import { AddPlaylistTrackCommand } from '../impl/add-playlist-track.command';
import { AddPlaylistTrackHandler } from './add-playlist-track.handler';

describe('AddPlaylistTrackHandler', () => {
  let handler: AddPlaylistTrackHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

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
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddPlaylistTrackHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<AddPlaylistTrackHandler>(AddPlaylistTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully add track to playlist', async () => {
    const command = new AddPlaylistTrackCommand(
      mockPlaylistId,
      { trackId: mockTrackId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue({ id: 'link-123' } as any);
    playlistRepository.addTrackToPlaylist.mockResolvedValue(undefined as any);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(libraryTrackRepository.getByLibraryAndTrack).toHaveBeenCalledWith(
      mockLibrary.id,
      mockTrackId,
    );
    expect(playlistRepository.addTrackToPlaylist).toHaveBeenCalledWith(mockPlaylistId, mockTrackId);
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new AddPlaylistTrackCommand(
      mockPlaylistId,
      { trackId: mockTrackId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new AddPlaylistTrackCommand(
      mockPlaylistId,
      { trackId: mockTrackId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(libraryTrackRepository.getByLibraryAndTrack).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if track is not in the library', async () => {
    const command = new AddPlaylistTrackCommand(
      mockPlaylistId,
      { trackId: mockTrackId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('Track is not in your library'),
    );
    expect(playlistRepository.addTrackToPlaylist).not.toHaveBeenCalled();
  });
});
