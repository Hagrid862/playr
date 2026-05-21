import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryPlaylistPinsQuery } from '../impl/get-library-playlist-pins.query';
import { GetLibraryPlaylistPinsHandler } from './get-library-playlist-pins.handler';

describe('GetLibraryPlaylistPinsHandler', () => {
  let handler: GetLibraryPlaylistPinsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const userId = 'user-1';
  const library = libraryBuilder({ id: 'lib-1', userId });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryPlaylistPinsHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get(GetLibraryPlaylistPinsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws PreconditionFailedException when user has no library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);
    const query = new GetLibraryPlaylistPinsQuery(userId);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.listActivePinsForLibrary).not.toHaveBeenCalled();
  });

  it('returns mapped pins with playlist cover', async () => {
    const cover = { id: 'img-1', url: 'https://example.com/cover.jpg' };
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([
      {
        id: 'pin-1',
        order: 0,
        playlist: {
          id: 'pl-1',
          name: 'Road Trip',
          systemRole: null,
          cover,
        },
      },
    ] as never);

    const result = await handler.execute(new GetLibraryPlaylistPinsQuery(userId));

    expect(playlistRepository.listActivePinsForLibrary).toHaveBeenCalledWith(library.id);
    expect(result).toEqual([
      {
        id: 'pin-1',
        order: 0,
        playlist: {
          id: 'pl-1',
          name: 'Road Trip',
          systemRole: null,
          cover,
        },
      },
    ]);
  });

  it('omits cover when pinned playlist has no cover image', async () => {
    libraryRepository.getByUserId.mockResolvedValue(library);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([
      {
        id: 'pin-2',
        order: 1,
        playlist: {
          id: 'pl-2',
          name: 'Workout',
          systemRole: null,
          cover: null,
        },
      },
    ] as never);

    const result = await handler.execute(new GetLibraryPlaylistPinsQuery(userId));

    expect(result[0]?.playlist.cover).toBeUndefined();
  });
});
