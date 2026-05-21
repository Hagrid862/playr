import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnpinPlaylistCommand } from '../impl/unpin-playlist.command';
import { UnpinPlaylistHandler } from './unpin-playlist.handler';

describe('UnpinPlaylistHandler', () => {
  let handler: UnpinPlaylistHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;

  const mockUserId = 'user-123';
  const mockPinId = 'pin-123';
  const mockLibrary = libraryBuilder({ id: 'lib-123', userId: mockUserId });
  const mockPin = {
    id: mockPinId,
    libraryId: 'lib-123',
    playlistId: 'playlist-123',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    playlistRepository = createMock<PlaylistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnpinPlaylistHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: PlaylistRepository, useValue: playlistRepository },
      ],
    }).compile();

    handler = module.get<UnpinPlaylistHandler>(UnpinPlaylistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully unpin playlist', async () => {
    const command = new UnpinPlaylistCommand(mockPinId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActivePinById.mockResolvedValue(mockPin);
    playlistRepository.softDeletePin.mockResolvedValue({ ...mockPin, deletedAt: new Date() });

    const result = await handler.execute(command);

    expect(result).toEqual({ id: mockPinId });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(mockUserId);
    expect(playlistRepository.findActivePinById).toHaveBeenCalledWith(mockPinId, mockLibrary.id);
    expect(playlistRepository.softDeletePin).toHaveBeenCalledWith(mockPinId);
  });

  it('should throw PreconditionFailedException if user library is not found', async () => {
    const command = new UnpinPlaylistCommand(mockPinId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
    expect(playlistRepository.findActivePinById).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if pin is not found', async () => {
    const command = new UnpinPlaylistCommand(mockPinId, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    playlistRepository.findActivePinById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(playlistRepository.softDeletePin).not.toHaveBeenCalled();
  });
});
