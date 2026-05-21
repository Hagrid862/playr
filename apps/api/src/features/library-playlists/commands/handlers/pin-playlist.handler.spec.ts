import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinPlaylistCommand } from '../impl/pin-playlist.command';
import { PinPlaylistHandler } from './pin-playlist.handler';

describe('PinPlaylistHandler', () => {
  let handler: PinPlaylistHandler;
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

  const mockPin = {
    id: 'pin-123',
    libraryId: 'lib-123',
    playlistId: mockPlaylistId,
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinPlaylistHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<PinPlaylistHandler>(PinPlaylistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully pin a playlist', async () => {
    const command = new PinPlaylistCommand({ playlistId: mockPlaylistId }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.maxPinOrder.mockResolvedValue(2);
    playlistRepository.pinPlaylist.mockResolvedValue(mockPin);

    const mockPlaylistsWithCover = [
      {
        ...mockPlaylist,
        cover: { id: 'img-123', url: 'http://bucket/cover.jpg' },
      },
    ];
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue(
      mockPlaylistsWithCover as any,
    );

    const result = await handler.execute(command);

    expect(result).toEqual({
      id: 'pin-123',
      order: 3,
      playlist: {
        id: mockPlaylistId,
        name: 'My Playlist',
        systemRole: null,
        cover: { id: 'img-123', url: 'http://bucket/cover.jpg' },
      },
    });

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActiveLibraryPlaylist).toHaveBeenCalledWith(
      mockPlaylistId,
      mockLibrary.id,
    );
    expect(playlistRepository.maxPinOrder).toHaveBeenCalledWith(mockLibrary.id);
    expect(playlistRepository.pinPlaylist).toHaveBeenCalledWith(mockLibrary.id, mockPlaylistId, 3);
    expect(playlistRepository.listLibraryPlaylistsWithCover).toHaveBeenCalledWith(mockLibrary.id);
  });

  it('should successfully pin a playlist when it has no cover', async () => {
    const command = new PinPlaylistCommand({ playlistId: mockPlaylistId }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(mockPlaylist);
    playlistRepository.maxPinOrder.mockResolvedValue(2);
    playlistRepository.pinPlaylist.mockResolvedValue(mockPin);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([]);

    const result = await handler.execute(command);

    expect(result).toEqual({
      id: 'pin-123',
      order: 3,
      playlist: {
        id: mockPlaylistId,
        name: 'My Playlist',
        systemRole: null,
        cover: undefined,
      },
    });
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new PinPlaylistCommand({ playlistId: mockPlaylistId }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActiveLibraryPlaylist).not.toHaveBeenCalled();
    expect(playlistRepository.pinPlaylist).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if playlist is not found', async () => {
    const command = new PinPlaylistCommand({ playlistId: mockPlaylistId }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActiveLibraryPlaylist.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.pinPlaylist).not.toHaveBeenCalled();
  });
});
