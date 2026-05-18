import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReorderPlaylistPinsCommand } from '../impl/reorder-playlist-pins.command';
import { ReorderPlaylistPinsHandler } from './reorder-playlist-pins.handler';

describe('ReorderPlaylistPinsHandler', () => {
  let handler: ReorderPlaylistPinsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReorderPlaylistPinsHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get(ReorderPlaylistPinsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws BadRequestException when orderedIds contains duplicate pin ids', async () => {
    const userId = 'user-1';
    libraryRepository.getByUserId.mockResolvedValue({ id: 'lib-1', userId } as never);

    const pinA = {
      id: 'pin-a',
      order: 0,
      libraryId: 'lib-1',
      playlistId: 'pl-a',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      playlist: {
        id: 'pl-a',
        name: 'A',
        systemRole: null,
        cover: null,
        libraryId: 'lib-1',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        isPublic: false,
        isCollaborative: false,
        artistId: null,
        coverId: null,
      },
    };
    const pinB = {
      ...pinA,
      id: 'pin-b',
      order: 1,
      playlistId: 'pl-b',
      playlist: { ...pinA.playlist, id: 'pl-b', name: 'B' },
    };

    playlistRepository.listActivePinsForLibrary.mockResolvedValue([pinA, pinB] as never);

    const command = new ReorderPlaylistPinsCommand({ orderedIds: ['pin-a', 'pin-a'] }, userId);

    await expect(handler.execute(command)).rejects.toBeInstanceOf(BadRequestException);
    expect(playlistRepository.reorderPins).not.toHaveBeenCalled();
  });
});
