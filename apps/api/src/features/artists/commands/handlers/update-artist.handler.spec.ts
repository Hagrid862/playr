import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import {
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
    PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateArtistCommand } from '../impl/update-artist.command';
import { UpdateArtistHandler } from './update-artist.handler';

describe('UpdateArtistHandler', () => {
  let handler: UpdateArtistHandler;
  let artistRepository: DeepMocked<ArtistRepository>;
  let privateProfileRepository: DeepMocked<PrivateProfileRepository>;

  const mockUserId = 'user-123';
  const mockArtistId = 'artist-123';
  const mockProfile = { id: 'profile-123', userId: mockUserId };
  const mockArtist: ZodArtist = {
    id: mockArtistId,
    name: 'Old Name',
    description: 'Old Description',
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
        UpdateArtistHandler,
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: PrivateProfileRepository, useValue: privateProfileRepository },
      ],
    }).compile();

    handler = module.get<UpdateArtistHandler>(UpdateArtistHandler);
  });

  it('should update an artist successfully', async () => {
    const dto = { name: 'New Name', description: 'New Description' };
    const command = new UpdateArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist, ...dto };

    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(mockArtist as any);
    artistRepository.getByNameAndOwnerId.mockResolvedValue(null);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist as any);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, dto);
  });

  it('should update an artist description only without checking name conflict', async () => {
    const dto = { description: 'New Description' };
    const command = new UpdateArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist, ...dto };

    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(mockArtist as any);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist as any);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    expect(artistRepository.getByNameAndOwnerId).not.toHaveBeenCalled();
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, {
      name: undefined,
      description: 'New Description',
    });
  });

  it('should throw PreconditionFailedException if private profile is missing', async () => {
    const command = new UpdateArtistCommand(mockArtistId, {}, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw NotFoundException if artist is missing', async () => {
    const command = new UpdateArtistCommand(mockArtistId, {}, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException if new name is already taken by another artist', async () => {
    const dto = { name: 'Taken Name' };
    const command = new UpdateArtistCommand(mockArtistId, dto, mockUserId);

    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(mockArtist as any);
    artistRepository.getByNameAndOwnerId.mockResolvedValue({ id: 'other-artist' } as any);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new UpdateArtistCommand(mockArtistId, {}, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    artistRepository.getByIdAndOwnerId.mockResolvedValue(mockArtist as any);
    artistRepository.update.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
