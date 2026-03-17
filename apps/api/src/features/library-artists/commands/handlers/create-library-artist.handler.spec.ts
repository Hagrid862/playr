import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { artistBuilder, libraryBuilder } from '@repo/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import {
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryArtistCommand } from '../impl/create-library-artist.command';
import { CreateLibraryArtistHandler } from './create-library-artist.handler';

describe('CreateLibraryArtistHandler', () => {
  let handler: CreateLibraryArtistHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let artistRepository: DeepMocked<ArtistRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryArtistRepository: DeepMocked<LibraryArtistRepository>;

  const mockUserId = 'user-123';
  const mockLibrary = libraryBuilder({ id: 'library-123', userId: mockUserId });
  const mockArtist = artistBuilder({
    id: 'artist-123',
    name: 'Test Artist',
    description: 'Test Description',
    isCommunity: false,
    verified: false,
    avatarId: null,
    bannerId: null,
    visibility: 'public',
  });

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    artistRepository = createMock<ArtistRepository>();
    libraryRepository = createMock<LibraryRepository>();
    libraryArtistRepository = createMock<LibraryArtistRepository>();

    // Mock unit of work to just execute the callback
    unitOfWork.runInTransaction.mockImplementation((cb) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryArtistHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryArtistRepository, useValue: libraryArtistRepository },
      ],
    }).compile();

    handler = module.get<CreateLibraryArtistHandler>(CreateLibraryArtistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an artist successfully', async () => {
    const command = new CreateLibraryArtistCommand(
      { name: 'Test Artist', description: 'Test Description' },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    artistRepository.findOne.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue(mockArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockArtist);
    expect(unitOfWork.runInTransaction).toHaveBeenCalled();
    expect(artistRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Artist',
        description: 'Test Description',
      }),
    );
    expect(libraryArtistRepository.create).toHaveBeenCalledWith({
      artist: { connect: { id: mockArtist.id } },
      library: { connect: { id: mockLibrary.id } },
    });
  });

  it('should throw PreconditionFailedException if library is missing', async () => {
    const command = new CreateLibraryArtistCommand({ name: 'Test' }, mockUserId);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw ConflictException if artist name is already taken', async () => {
    const command = new CreateLibraryArtistCommand({ name: 'Taken' }, mockUserId);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    artistRepository.findOne.mockResolvedValue({ id: 'existing' } as any);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new CreateLibraryArtistCommand({ name: 'Test' }, mockUserId);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    artistRepository.findOne.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
