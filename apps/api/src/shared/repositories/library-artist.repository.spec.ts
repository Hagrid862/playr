import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryArtist, PrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { LibraryArtistRepository } from './library-artist.repository';

describe('LibraryArtistRepository', () => {
  let repository: LibraryArtistRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockLibraryArtist: LibraryArtist = {
    id: 'la-123',
    libraryId: 'lib-123',
    artistId: 'artist-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryArtistRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<LibraryArtistRepository>(LibraryArtistRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getByLibraryIdAndArtistId', () => {
    it('should return library artist with deletedAt: null filter', async () => {
      mockTx.libraryArtist.findUnique.mockResolvedValue(mockLibraryArtist);

      const result = await repository.getByLibraryIdAndArtistId('lib-123', 'artist-123');

      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.findUnique).toHaveBeenCalledWith({
        where: {
          libraryId_artistId: {
            libraryId: 'lib-123',
            artistId: 'artist-123',
          },
          artist: {
            deletedAt: null,
          },
        },
        include: {
          artist: {
            include: {
              avatar: true,
              banner: true,
            },
          },
        },
      });
    });
  });

  describe('getByLibraryId', () => {
    it('should return paginated library artists with deletedAt: null filter', async () => {
      mockTx.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);

      const result = await repository.getByLibraryId('lib-123', 1, 10);

      expect(result).toEqual([mockLibraryArtist]);
      expect(mockTx.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          libraryId: 'lib-123',
          artist: {
            deletedAt: null,
          },
        },
        include: {
          artist: {
            include: {
              avatar: true,
              banner: true,
            },
          },
        },
        orderBy: undefined,
      });
    });
  });

  describe('countByLibraryId', () => {
    it('should count library artists with deletedAt: null filter', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(1);

      const result = await repository.countByLibraryId('lib-123');

      expect(result).toBe(1);
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-123',
          artist: {
            deletedAt: null,
          },
        },
      });
    });
  });
});
