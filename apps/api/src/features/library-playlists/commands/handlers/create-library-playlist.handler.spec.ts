import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  ConflictException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistSystemRole } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryPlaylistCommand } from '../impl/create-library-playlist.command';
import { CreateLibraryPlaylistHandler } from './create-library-playlist.handler';

describe('CreateLibraryPlaylistHandler', () => {
  let handler: CreateLibraryPlaylistHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const mockUserId = 'user-123';
  const mockLibrary = libraryBuilder({ id: 'lib-123', userId: mockUserId });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryPlaylistHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<CreateLibraryPlaylistHandler>(CreateLibraryPlaylistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create a library playlist', async () => {
    const command = new CreateLibraryPlaylistCommand({ name: 'My New Playlist' }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.getByNameForLibrary.mockResolvedValue(null);

    const mockCreatedPlaylist = {
      id: 'playlist-123',
      name: 'My New Playlist',
      systemRole: null as PlaylistSystemRole | null,
      libraryId: 'lib-123',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    playlistRepository.createUserPlaylist.mockResolvedValue(mockCreatedPlaylist as any);

    const result = await handler.execute(command);

    expect(result).toEqual({
      id: 'playlist-123',
      name: 'My New Playlist',
      systemRole: null,
      cover: undefined,
      trackCount: 0,
      pinned: false,
      pinOrder: null,
      pinId: null,
    });

    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.getByNameForLibrary).toHaveBeenCalledWith(
      mockLibrary.id,
      'My New Playlist',
    );
    expect(playlistRepository.createUserPlaylist).toHaveBeenCalledWith(
      mockLibrary.id,
      'My New Playlist',
    );
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new CreateLibraryPlaylistCommand({ name: 'My New Playlist' }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.getByNameForLibrary).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if playlist name is empty or only whitespace', async () => {
    const command = new CreateLibraryPlaylistCommand({ name: '   ' }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);

    await expect(handler.execute(command)).rejects.toThrow(
      new BadRequestException('Name is required'),
    );
    expect(playlistRepository.getByNameForLibrary).not.toHaveBeenCalled();
  });

  it('should throw ConflictException if playlist name is already taken in the library', async () => {
    const command = new CreateLibraryPlaylistCommand({ name: 'Duplicate Name' }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.getByNameForLibrary.mockResolvedValue({ id: 'existing-playlist' } as any);

    await expect(handler.execute(command)).rejects.toThrow(
      new ConflictException('This playlist name is already taken'),
    );
    expect(playlistRepository.createUserPlaylist).not.toHaveBeenCalled();
  });
});
