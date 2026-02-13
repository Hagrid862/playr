import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { GetLibraryArtistQuery } from '../impl/get-library-artist.query';
import { GetLibraryArtistHandler } from './get-library-artist.handler';

describe('GetLibraryArtistHandler', () => {
  let handler: GetLibraryArtistHandler;
  let libraryRepository: LibraryRepository;
  let libraryArtistRepository: LibraryArtistRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistHandler,
        {
          provide: LibraryRepository,
          useValue: {
            getByUserId: vi.fn(),
          },
        },
        {
          provide: LibraryArtistRepository,
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistHandler>(GetLibraryArtistHandler);
    libraryRepository = module.get<LibraryRepository>(LibraryRepository);
    libraryArtistRepository = module.get<LibraryArtistRepository>(LibraryArtistRepository);
  });

  it('should return library artist if found', async () => {
    const userId = 'user-123';
    const artistId = 'artist-123';
    const libraryId = 'lib-123';
    const mockLibrary = { id: libraryId };
    const mockLibraryArtist = { id: 'la-123', artistId, libraryId };

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(mockLibrary as any);
    vi.mocked(libraryArtistRepository.findOne).mockResolvedValue(mockLibraryArtist as any);

    const query = new GetLibraryArtistQuery(userId, artistId);
    const result = await handler.execute(query);

    expect(result).toEqual(mockLibraryArtist);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findOne).toHaveBeenCalledWith({
      libraryId,
      artistId,
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    const userId = 'user-123';
    const artistId = 'artist-123';

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(null);

    const query = new GetLibraryArtistQuery(userId, artistId);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findOne).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if artist not found in library', async () => {
    const userId = 'user-123';
    const artistId = 'artist-123';
    const libraryId = 'lib-123';
    const mockLibrary = { id: libraryId };

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(mockLibrary as any);
    vi.mocked(libraryArtistRepository.findOne).mockResolvedValue(null);

    const query = new GetLibraryArtistQuery(userId, artistId);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findOne).toHaveBeenCalledWith({
      libraryId,
      artistId,
    });
  });
});
