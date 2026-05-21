import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryPlaylistsQuery } from '../impl/get-library-playlists.query';
import { GetLibraryPlaylistsHandler } from './get-library-playlists.handler';

describe('GetLibraryPlaylistsHandler', () => {
  let handler: GetLibraryPlaylistsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const userId = 'user-1';
  const library = libraryBuilder({ id: 'lib-1', userId });

  const playlistBase = {
    systemRole: null as PlaylistSystemRole | null,
    cover: null,
    _count: { tracks: 0 },
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryPlaylistsHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get(GetLibraryPlaylistsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws PreconditionFailedException when user has no library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(new GetLibraryPlaylistsQuery(userId))).rejects.toThrow(
      PreconditionFailedException,
    );
    expect(playlistRepository.listLibraryPlaylistsWithCover).not.toHaveBeenCalled();
    expect(playlistRepository.listActivePinsForLibrary).not.toHaveBeenCalled();
  });

  it('sorts favorites first, then pinned by order, then unpinned alphabetically', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { id: 'pl-z', name: 'Zebra', ...playlistBase },
      {
        id: 'pl-fav',
        name: 'Favorites',
        systemRole: PlaylistSystemRole.favorites,
        cover: null,
        _count: { tracks: 3 },
      },
      { id: 'pl-pin-b', name: 'Pinned B', ...playlistBase, _count: { tracks: 1 } },
      { id: 'pl-pin-a', name: 'Pinned A', ...playlistBase, _count: { tracks: 2 } },
      { id: 'pl-alpha', name: 'Alpha', ...playlistBase, _count: { tracks: 4 } },
    ] as never);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([
      {
        id: 'pin-b',
        playlistId: 'pl-pin-b',
        order: 1,
        playlist: { id: 'pl-pin-b', name: 'Pinned B', systemRole: null, cover: null },
      },
      {
        id: 'pin-a',
        playlistId: 'pl-pin-a',
        order: 0,
        playlist: { id: 'pl-pin-a', name: 'Pinned A', systemRole: null, cover: null },
      },
    ] as never);

    const result = await handler.execute(new GetLibraryPlaylistsQuery(userId));

    expect(result.items.map((item) => item.id)).toEqual([
      'pl-fav',
      'pl-pin-a',
      'pl-pin-b',
      'pl-alpha',
      'pl-z',
    ]);
    expect(result.items[0]).toMatchObject({
      id: 'pl-fav',
      trackCount: 3,
      pinned: false,
      pinOrder: null,
      pinId: null,
      cover: undefined,
    });
    expect(result.items[1]).toMatchObject({
      id: 'pl-pin-a',
      pinned: true,
      pinOrder: 0,
      pinId: 'pin-a',
    });
    expect(result.items[3]).toMatchObject({
      id: 'pl-alpha',
      pinned: false,
      pinOrder: null,
      pinId: null,
    });
  });

  it('places favorites before unpinned playlists', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { id: 'pl-regular', name: 'Regular', ...playlistBase },
      {
        id: 'pl-fav',
        name: 'Favorites',
        systemRole: PlaylistSystemRole.favorites,
        cover: null,
        _count: { tracks: 1 },
      },
    ] as never);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([]);

    const result = await handler.execute(new GetLibraryPlaylistsQuery(userId));

    expect(result.items.map((item) => item.id)).toEqual(['pl-fav', 'pl-regular']);
  });

  it('places pinned playlists before unpinned non-favorites', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { id: 'pl-unpinned', name: 'Zulu', ...playlistBase },
      { id: 'pl-pinned', name: 'Alpha', ...playlistBase },
    ] as never);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([
      {
        id: 'pin-1',
        playlistId: 'pl-pinned',
        order: 0,
        playlist: { id: 'pl-pinned', name: 'Alpha', systemRole: null, cover: null },
      },
    ] as never);

    const result = await handler.execute(new GetLibraryPlaylistsQuery(userId));

    expect(result.items.map((item) => item.id)).toEqual(['pl-pinned', 'pl-unpinned']);
  });

  it('treats missing pin order as zero when comparing pinned playlists', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { id: 'pl-a', name: 'A', ...playlistBase },
      { id: 'pl-b', name: 'B', ...playlistBase },
    ] as never);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([
      {
        id: 'pin-a',
        playlistId: 'pl-a',
        order: undefined,
        playlist: { id: 'pl-a', name: 'A', systemRole: null, cover: null },
      },
      {
        id: 'pin-b',
        playlistId: 'pl-b',
        order: undefined,
        playlist: { id: 'pl-b', name: 'B', systemRole: null, cover: null },
      },
    ] as never);

    const result = await handler.execute(new GetLibraryPlaylistsQuery(userId));

    expect(result.items.map((item) => item.id)).toEqual(['pl-a', 'pl-b']);
    expect(result.items.every((item) => item.pinOrder === null)).toBe(true);
  });

  it('includes cover on list items when present', async () => {
    const cover = { id: 'img-1', url: 'https://example.com/cover.jpg' };
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listLibraryPlaylistsWithCover.mockResolvedValue([
      { id: 'pl-1', name: 'With Cover', systemRole: null, cover, _count: { tracks: 5 } },
    ] as never);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([]);

    const result = await handler.execute(new GetLibraryPlaylistsQuery(userId));

    expect(result.items).toEqual([
      {
        id: 'pl-1',
        name: 'With Cover',
        systemRole: null,
        cover,
        trackCount: 5,
        pinned: false,
        pinOrder: null,
        pinId: null,
      },
    ]);
  });
});
