import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import {
    InternalServerErrorException,
    NotFoundException,
    PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteArtistCommand } from '../impl/delete-artist.command';
import { DeleteArtistHandler } from './delete-artist.handler';

describe('DeleteArtistHandler', () => {
  let handler: DeleteArtistHandler;
  let artistRepository: DeepMocked<ArtistRepository>;
  let privateProfileRepository: DeepMocked<PrivateProfileRepository>;

  const mockUserId = 'user-123';
  const mockArtistId = 'artist-123';
  const mockProfile = { id: 'profile-123', userId: mockUserId };
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
  };

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();
    privateProfileRepository = createMock<PrivateProfileRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteArtistHandler,
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: PrivateProfileRepository, useValue: privateProfileRepository },
      ],
    }).compile();

    handler = module.get<DeleteArtistHandler>(DeleteArtistHandler);
  });

  it('should delete an artist successfully', async () => {
    const command = new DeleteArtistCommand(mockArtistId, mockUserId);
    const mockDeletedArtist = { ...mockArtist, deletedAt: new Date() };

    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(mockArtist as any);
    artistRepository.update.mockResolvedValue(mockDeletedArtist as any);

    const result = await handler.execute(command);

    expect(result).toEqual(mockDeletedArtist);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, {
      deletedAt: expect.any(Date),
    });
  });

  it('should throw PreconditionFailedException if private profile is missing', async () => {
    const command = new DeleteArtistCommand(mockArtistId, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw NotFoundException if artist is missing or permission denied', async () => {
    const command = new DeleteArtistCommand(mockArtistId, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new DeleteArtistCommand(mockArtistId, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(mockArtist as any);
    artistRepository.update.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
