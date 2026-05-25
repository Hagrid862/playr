import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryPlaylistDetailQuery } from '../impl/get-library-playlist-detail.query';
import { GetLibraryPlaylistDetailHandler } from './get-library-playlist-detail.handler';

describe('GetLibraryPlaylistDetailHandler', () => {
  let handler: GetLibraryPlaylistDetailHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const userId = 'user-1';
  const library = libraryBuilder({ id: 'lib-1', userId });
  const playlistId = 'pl-1';
  const addedAt = new Date('2024-01-15');

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryPlaylistDetailHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get(GetLibraryPlaylistDetailHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws PreconditionFailedException when user has no library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);
    const query = new GetLibraryPlaylistDetailQuery(userId, playlistId, 1, 20, 'order');

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.getPlaylistDetailPage).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when playlist detail is missing', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.getPlaylistDetailPage.mockResolvedValue(null);
    const query = new GetLibraryPlaylistDetailQuery(userId, playlistId, 1, 20, 'order');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.getPlaylistDetailPage).toHaveBeenCalledWith(
      playlistId,
      library.id,
      1,
      20,
      'order',
    );
  });

  it('returns mapped playlist detail with tracks', async () => {
    const cover = { id: 'img-1', url: 'https://example.com/cover.jpg' };
    const track = { id: 'track-1', title: 'Song' };
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.getPlaylistDetailPage.mockResolvedValue({
      playlist: {
        id: playlistId,
        name: 'Road Trip',
        systemRole: null,
        cover,
      },
      trackRows: [{ addedAt, track }],
      totalTracks: 1,
    } as never);

    const query = new GetLibraryPlaylistDetailQuery(userId, playlistId, 2, 10, 'addedAt_desc');
    const result = await handler.execute(query);

    expect(result).toEqual({
      id: playlistId,
      name: 'Road Trip',
      systemRole: null,
      cover,
      tracks: [{ addedAt, track }],
      page: 2,
      limit: 10,
      totalTracks: 1,
    });
  });

  it('omits cover when playlist has no cover image', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.getPlaylistDetailPage.mockResolvedValue({
      playlist: {
        id: playlistId,
        name: 'Favorites',
        systemRole: PlaylistSystemRole.favorites,
        cover: null,
      },
      trackRows: [],
      totalTracks: 0,
    } as never);

    const query = new GetLibraryPlaylistDetailQuery(userId, playlistId, 1, 20, 'order');
    const result = await handler.execute(query);

    expect(result.cover).toBeUndefined();
    expect(result.tracks).toEqual([]);
  });
});
