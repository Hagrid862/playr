import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddPlaylistAlbumCommand } from '../impl/add-playlist-album.command';
import { AddPlaylistAlbumHandler } from './add-playlist-album.handler';

describe('AddPlaylistAlbumHandler', () => {
  let handler: AddPlaylistAlbumHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;
  let albumRepository: DeepMocked<AlbumRepository>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-123';
  const mockAlbumId = 'album-123';
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
    albumRepository = createMock<AlbumRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddPlaylistAlbumHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
        { provide: AlbumRepository, useValue: albumRepository },
      ],
    }).compile();

    handler = module.get<AddPlaylistAlbumHandler>(AddPlaylistAlbumHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully add album tracks to playlist', async () => {
    const command = new AddPlaylistAlbumCommand(
      mockPlaylistId,
      { albumId: mockAlbumId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    albumRepository.checkAccess.mockResolvedValue(true);

    const mockLibraryTracks = [{ trackId: 'track-1' }, { trackId: 'track-2' }] as any[];
    libraryTrackRepository.listByLibraryAndAlbum.mockResolvedValue(mockLibraryTracks);
    playlistRepository.addTracksToPlaylist.mockResolvedValue({ addedCount: 2 } as any);

    const result = await handler.execute(command);

    expect(result).toEqual({ ok: true, addedCount: 2, trackCount: 2 });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(albumRepository.checkAccess).toHaveBeenCalledWith(mockAlbumId, mockUserId);
    expect(libraryTrackRepository.listByLibraryAndAlbum).toHaveBeenCalledWith(
      mockLibrary.id,
      mockAlbumId,
      {
        orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
      },
    );
    expect(playlistRepository.addTracksToPlaylist).toHaveBeenCalledWith(mockPlaylistId, [
      'track-1',
      'track-2',
    ]);
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new AddPlaylistAlbumCommand(
      mockPlaylistId,
      { albumId: mockAlbumId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new AddPlaylistAlbumCommand(
      mockPlaylistId,
      { albumId: mockAlbumId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(albumRepository.checkAccess).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if album is not found and user has no access', async () => {
    const command = new AddPlaylistAlbumCommand(
      mockPlaylistId,
      { albumId: mockAlbumId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    albumRepository.checkAccess.mockResolvedValue(false);
    albumRepository.exists.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(
      new NotFoundException('Album not found'),
    );
    expect(libraryTrackRepository.listByLibraryAndAlbum).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if user has no access but album exists', async () => {
    const command = new AddPlaylistAlbumCommand(
      mockPlaylistId,
      { albumId: mockAlbumId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    albumRepository.checkAccess.mockResolvedValue(false);
    albumRepository.exists.mockResolvedValue(true);

    await expect(handler.execute(command)).rejects.toThrow(
      new ForbiddenException('You do not have access to this album'),
    );
    expect(libraryTrackRepository.listByLibraryAndAlbum).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if album has no tracks in library', async () => {
    const command = new AddPlaylistAlbumCommand(
      mockPlaylistId,
      { albumId: mockAlbumId },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    albumRepository.checkAccess.mockResolvedValue(true);
    libraryTrackRepository.listByLibraryAndAlbum.mockResolvedValue([]);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('Album has no tracks in your library'),
    );
    expect(playlistRepository.addTracksToPlaylist).not.toHaveBeenCalled();
  });
});
