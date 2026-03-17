import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { artistBuilder } from '@repo/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Visibility } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryArtistCommand } from '../impl/update-library-artist.command';
import { UpdateLibraryArtistHandler } from './update-library-artist.handler';

describe('UpdateLibraryArtistHandler', () => {
  let handler: UpdateLibraryArtistHandler;
  let artistRepository: DeepMocked<ArtistRepository>;

  const mockUserId = 'user-123';
  const mockArtistId = 'artist-123';
  const mockArtist = artistBuilder({
    id: mockArtistId,
    name: 'Old Name',
    description: 'Old Description',
    isCommunity: false,
    verified: false,
    avatarId: null,
    bannerId: null,
    visibility: Visibility.public,
  });

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryArtistHandler,
        { provide: ArtistRepository, useValue: artistRepository },
      ],
    }).compile();

    handler = module.get<UpdateLibraryArtistHandler>(UpdateLibraryArtistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update an artist successfully', async () => {
    const dto = { name: 'New Name', description: 'New Description' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist, ...dto };

    artistRepository.findOne.mockResolvedValueOnce(mockArtist); // Check existence
    artistRepository.findOne.mockResolvedValueOnce(null); // Check name conflict
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, dto);
  });

  it('should update an artist description only without checking name conflict', async () => {
    const dto = { description: 'New Description' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist, ...dto };

    artistRepository.findOne.mockResolvedValue(mockArtist);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    // Should call findOne only once for existence check
    expect(artistRepository.findOne).toHaveBeenCalledTimes(1);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, {
      name: undefined,
      description: 'New Description',
    });
  });

  it('should throw NotFoundException if artist is missing', async () => {
    const command = new UpdateLibraryArtistCommand(mockArtistId, {}, mockUserId);
    artistRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException if new name is already taken by another artist', async () => {
    const dto = { name: 'Taken Name' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);

    artistRepository.findOne.mockResolvedValueOnce(mockArtist); // Existence
    artistRepository.findOne.mockResolvedValueOnce(artistBuilder({ id: 'other-artist' })); // Conflict

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new UpdateLibraryArtistCommand(mockArtistId, {}, mockUserId);
    artistRepository.findOne.mockResolvedValue(mockArtist);
    artistRepository.update.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
