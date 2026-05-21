import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { BadRequestException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReorderPlaylistPinsCommand } from '../impl/reorder-playlist-pins.command';
import { ReorderPlaylistPinsHandler } from './reorder-playlist-pins.handler';

describe('ReorderPlaylistPinsHandler', () => {
  let handler: ReorderPlaylistPinsHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const mockUserId = 'user-123';
  const mockLibrary = libraryBuilder({ id: 'lib-123', userId: mockUserId });

  const pinA = {
    id: 'pin-a',
    order: 0,
    libraryId: 'lib-123',
    playlistId: 'pl-a',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    playlist: {
      id: 'pl-a',
      name: 'Playlist A',
      systemRole: null as PlaylistSystemRole | null,
      cover: { id: 'img-a', url: 'http://bucket/a.jpg' } as any,
      libraryId: 'lib-123',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      isPublic: false,
      isCollaborative: false,
      artistId: null,
      coverId: 'img-a',
    },
  };

  const pinB = {
    ...pinA,
    id: 'pin-b',
    order: 1,
    playlistId: 'pl-b',
    playlist: {
      ...pinA.playlist,
      id: 'pl-b',
      name: 'Playlist B',
      cover: null,
      coverId: null,
    },
  };

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

    handler = module.get<ReorderPlaylistPinsHandler>(ReorderPlaylistPinsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully reorder playlist pins', async () => {
    const command = new ReorderPlaylistPinsCommand({ orderedIds: ['pin-b', 'pin-a'] }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.listActivePinsForLibrary
      .mockResolvedValueOnce([pinA, pinB] as any)
      .mockResolvedValueOnce([
        { ...pinB, order: 0 },
        { ...pinA, order: 1 },
      ] as any);
    playlistRepository.reorderPins.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result).toEqual([
      {
        id: 'pin-b',
        order: 0,
        playlist: {
          id: 'pl-b',
          name: 'Playlist B',
          systemRole: null,
          cover: undefined,
        },
      },
      {
        id: 'pin-a',
        order: 1,
        playlist: {
          id: 'pl-a',
          name: 'Playlist A',
          systemRole: null,
          cover: pinA.playlist.cover,
        },
      },
    ]);

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.listActivePinsForLibrary).toHaveBeenCalledTimes(2);
    expect(playlistRepository.reorderPins).toHaveBeenCalledWith('lib-123', ['pin-b', 'pin-a']);
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new ReorderPlaylistPinsCommand({ orderedIds: ['pin-b', 'pin-a'] }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.listActivePinsForLibrary).not.toHaveBeenCalled();
    expect(playlistRepository.reorderPins).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if orderedIds contains duplicates', async () => {
    const command = new ReorderPlaylistPinsCommand({ orderedIds: ['pin-a', 'pin-a'] }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([pinA, pinB] as any);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('orderedIds must not contain duplicate pin ids'),
    );
    expect(playlistRepository.reorderPins).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if orderedIds length does not match current pins length', async () => {
    const command = new ReorderPlaylistPinsCommand(
      { orderedIds: ['pin-a'] }, // Only 1 pin provided, but 2 exist
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([pinA, pinB] as any);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('orderedIds must include every pin exactly once'),
    );
    expect(playlistRepository.reorderPins).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if orderedIds contains unknown pin ids', async () => {
    const command = new ReorderPlaylistPinsCommand(
      { orderedIds: ['pin-b', 'pin-unknown'] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.listActivePinsForLibrary.mockResolvedValue([pinA, pinB] as any);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('Unknown pin id in orderedIds'),
    );
    expect(playlistRepository.reorderPins).not.toHaveBeenCalled();
  });
});
