import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import {
    ConflictException,
    InternalServerErrorException,
    PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateArtistCommand } from '../impl/create-artist.command';
import { CreateArtistHandler } from './create-artist.handler';

describe('CreateArtistHandler', () => {
  let handler: CreateArtistHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let artistRepository: DeepMocked<ArtistRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryArtistRepository: DeepMocked<LibraryArtistRepository>;
  let privateProfileRepository: DeepMocked<PrivateProfileRepository>;

  const mockUserId = 'user-123';
  const mockProfile = { id: 'profile-123', userId: mockUserId };
  const mockLibrary = { id: 'library-123', userId: mockUserId };
  const mockArtist: ZodArtist = {
    id: 'artist-123',
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
    unitOfWork = createMock<UnitOfWorkService>();
    artistRepository = createMock<ArtistRepository>();
    libraryRepository = createMock<LibraryRepository>();
    libraryArtistRepository = createMock<LibraryArtistRepository>();
    privateProfileRepository = createMock<PrivateProfileRepository>();

    // Mock unit of work to just execute the callback
    unitOfWork.runInTransaction.mockImplementation((cb) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateArtistHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryArtistRepository, useValue: libraryArtistRepository },
        { provide: PrivateProfileRepository, useValue: privateProfileRepository },
      ],
    }).compile();

    handler = module.get<CreateArtistHandler>(CreateArtistHandler);
  });

  it('should create an artist successfully', async () => {
    const command = new CreateArtistCommand(
      { name: 'Test Artist', description: 'Test Description' },
      mockUserId,
    );

    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary as any);
    artistRepository.getByNameAndOwnerId.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue(mockArtist as any);

    const result = await handler.execute(command);

    expect(result).toEqual(mockArtist);
    expect(unitOfWork.runInTransaction).toHaveBeenCalled();
    expect(artistRepository.create).toHaveBeenCalledWith({
      name: 'Test Artist',
      description: 'Test Description',
      privateArtistProfile: {
        create: {
          userPrivateProfileId: mockProfile.id,
        },
      },
    });
    expect(libraryArtistRepository.create).toHaveBeenCalledWith({
      artist: { connect: { id: mockArtist.id } },
      library: { connect: { id: mockLibrary.id } },
    });
  });

  it('should throw PreconditionFailedException if private profile is missing', async () => {
    const command = new CreateArtistCommand({ name: 'Test' }, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(null);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary as any);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw PreconditionFailedException if library is missing', async () => {
    const command = new CreateArtistCommand({ name: 'Test' }, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw ConflictException if artist name is already taken', async () => {
    const command = new CreateArtistCommand({ name: 'Taken' }, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary as any);
    artistRepository.getByNameAndOwnerId.mockResolvedValue({ id: 'existing' } as any);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new CreateArtistCommand({ name: 'Test' }, mockUserId);
    privateProfileRepository.getByUserId.mockResolvedValue(mockProfile as any);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary as any);
    artistRepository.getByNameAndOwnerId.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
