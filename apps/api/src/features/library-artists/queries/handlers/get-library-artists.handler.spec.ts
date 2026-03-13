import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildLibrary, buildLibraryArtist } from '@repo/testing';
import { GetLibraryArtistsQuery } from '../impl/get-library-artists.query';
import { GetLibraryArtistsHandler } from './get-library-artists.handler';

describe('GetLibraryArtistsHandler', () => {
  let handler: GetLibraryArtistsHandler;
  let libraryRepository: LibraryRepository;
  let libraryArtistRepository: LibraryArtistRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistsHandler,
        {
          provide: LibraryRepository,
          useValue: {
            getByUserId: vi.fn(),
          },
        },
        {
          provide: LibraryArtistRepository,
          useValue: {
            findMany: vi.fn(),
            count: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistsHandler>(GetLibraryArtistsHandler);
    libraryRepository = module.get<LibraryRepository>(LibraryRepository);
    libraryArtistRepository = module.get<LibraryArtistRepository>(LibraryArtistRepository);
  });

  it('should return library artists list with metadata', async () => {
    const userId = 'user-123';
    const page = 1;
    const limit = 10;
    const libraryId = 'lib-123';
    const mockLibrary = buildLibrary({ id: libraryId });
    const mockItems = [
      buildLibraryArtist({ id: 'la-1', libraryId }),
      buildLibraryArtist({ id: 'la-2', libraryId }),
    ];
    const mockTotal = 2;

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(mockLibrary);
    vi.mocked(libraryArtistRepository.findMany).mockResolvedValue(mockItems);
    vi.mocked(libraryArtistRepository.count).mockResolvedValue(mockTotal);

    const query = new GetLibraryArtistsQuery(userId, page, limit);
    const result = await handler.execute(query);

    expect(result).toEqual({
      items: mockItems,
      total: mockTotal,
      page,
      limit,
    });
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findMany).toHaveBeenCalledWith({
      where: { libraryId },
      skip: 0,
      take: limit,
    });
    expect(libraryArtistRepository.count).toHaveBeenCalledWith({ libraryId });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    const userId = 'user-123';
    const page = 1;
    const limit = 10;

    vi.mocked(libraryRepository.getByUserId).mockResolvedValue(null);

    const query = new GetLibraryArtistsQuery(userId, page, limit);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findMany).not.toHaveBeenCalled();
    expect(libraryArtistRepository.count).not.toHaveBeenCalled();
  });
});
