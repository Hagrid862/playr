import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteLibraryArtistCommand } from '../impl/delete-library-artist.command';
import { DeleteLibraryArtistHandler } from './delete-library-artist.handler';

describe('DeleteLibraryArtistHandler', () => {
  let handler: DeleteLibraryArtistHandler;
  let artistRepository: DeepMocked<ArtistRepository>;

  const mockUserId = 'user-123';
  const mockArtistId = 'artist-123';
  const mockArtist: ZodArtist = {
    id: mockArtistId,
    name: 'Test Artist',
    description: 'Test Description',
    isCommunity: false,
    verified: false,
    avatarId: null,
    bannerId: null,
    avatar: null,
    banner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    visibility: 'public',
  };

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryArtistHandler,
        { provide: ArtistRepository, useValue: artistRepository },
      ],
    }).compile();

    handler = module.get<DeleteLibraryArtistHandler>(DeleteLibraryArtistHandler);
  });

  it('should delete an artist successfully', async () => {
    const command = new DeleteLibraryArtistCommand(mockArtistId, mockUserId);
    const mockDeletedArtist = { ...mockArtist, deletedAt: new Date() };

    artistRepository.findOne.mockResolvedValue(mockArtist as any);
    artistRepository.softDeleteCascade.mockResolvedValue(mockDeletedArtist as any);

    const result = await handler.execute(command);

    expect(result).toEqual(mockDeletedArtist);
    expect(artistRepository.softDeleteCascade).toHaveBeenCalledWith(mockArtistId);
  });

  it('should throw NotFoundException if artist is missing or permission denied', async () => {
    const command = new DeleteLibraryArtistCommand(mockArtistId, mockUserId);
    artistRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new DeleteLibraryArtistCommand(mockArtistId, mockUserId);
    artistRepository.findOne.mockResolvedValue(mockArtist as any);
    artistRepository.softDeleteCascade.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
