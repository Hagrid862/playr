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
import { ReorderPlaylistTracksCommand } from '../impl/reorder-playlist-tracks.command';
import { ReorderPlaylistTracksHandler } from './reorder-playlist-tracks.handler';

describe('ReorderPlaylistTracksHandler', () => {
  let handler: ReorderPlaylistTracksHandler;
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
        ReorderPlaylistTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<ReorderPlaylistTracksHandler>(ReorderPlaylistTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully reorder playlist tracks', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t2', 't1', 't3'] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.listActiveTrackIdsOrdered.mockResolvedValue(['t1', 't2', 't3']);
    playlistRepository.reorderPlaylistTracks.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(playlistRepository.listActiveTrackIdsOrdered).toHaveBeenCalledWith(mockPlaylistId);
    expect(playlistRepository.reorderPlaylistTracks).toHaveBeenCalledWith(mockPlaylistId, [
      't2',
      't1',
      't3',
    ]);
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t2', 't1'] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t2', 't1'] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.listActiveTrackIdsOrdered).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if trying to reorder the favorites playlist', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t2', 't1'] },
      mockUserId,
    );

    const favoritesPlaylist = { ...mockPlaylist, systemRole: PlaylistSystemRole.favorites };
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(favoritesPlaylist);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.listActiveTrackIdsOrdered).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if orderedTrackIds length does not match current tracks length', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t2', 't1'] }, // 2 tracks
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.listActiveTrackIdsOrdered.mockResolvedValue(['t1', 't2', 't3']); // 3 tracks

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.reorderPlaylistTracks).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if orderedTrackIds contains duplicates', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t1', 't1'] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.listActiveTrackIdsOrdered.mockResolvedValue(['t1', 't2']);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.reorderPlaylistTracks).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if orderedTrackIds contains unknown track ids', async () => {
    const command = new ReorderPlaylistTracksCommand(
      mockPlaylistId,
      { orderedTrackIds: ['t1', 't3'] }, // t3 is unknown
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.listActiveTrackIdsOrdered.mockResolvedValue(['t1', 't2']);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(playlistRepository.reorderPlaylistTracks).not.toHaveBeenCalled();
  });
});
