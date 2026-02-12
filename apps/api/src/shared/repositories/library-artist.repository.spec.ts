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

  describe('getById', () => {
    it('should return library artist by id', async () => {
      mockTx.libraryArtist.findUnique.mockResolvedValue(mockLibraryArtist);
      const result = await repository.getById('la-123');
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.findUnique).toHaveBeenCalledWith({ where: { id: 'la-123' } });
    });
  });

  describe('getByArtistIdAndUserId', () => {
    it('should return library artist by artist id and user id', async () => {
      mockTx.libraryArtist.findFirst.mockResolvedValue(mockLibraryArtist);
      const result = await repository.getByArtistIdAndUserId('artist-123', 'user-123');
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.findFirst).toHaveBeenCalledWith({
        where: {
          artistId: 'artist-123',
          library: {
            userId: 'user-123',
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

  describe('getAllByLibraryId', () => {
    it('should return all library artists by library id', async () => {
      mockTx.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);
      const result = await repository.getAllByLibraryId('lib-123');
      expect(result).toEqual([mockLibraryArtist]);
      expect(mockTx.libraryArtist.findMany).toHaveBeenCalledWith({
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
      });
    });
  });

  describe('exists', () => {
    it('should return true if library artist exists', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(1);
      const result = await repository.exists('la-123');
      expect(result).toBe(true);
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({ where: { id: 'la-123' } });
    });

    it('should return false if library artist does not exist', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(0);
      const result = await repository.exists('la-123');
      expect(result).toBe(false);
    });
  });

  describe('existsInLibrary', () => {
    it('should return true if artist exists in library', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(1);
      const result = await repository.existsInLibrary('lib-123', 'artist-123');
      expect(result).toBe(true);
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-123',
          artistId: 'artist-123',
        },
      });
    });
  });

  describe('count', () => {
    it('should return count of library artists', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(5);
      const result = await repository.count();
      expect(result).toBe(5);
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({ where: undefined });
    });
  });

  describe('create', () => {
    it('should create a library artist', async () => {
      mockTx.libraryArtist.create.mockResolvedValue(mockLibraryArtist);
      const data = {
        library: { connect: { id: 'lib-123' } },
        artist: { connect: { id: 'artist-123' } },
      };

      const result = await repository.create(data as any);
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update a library artist', async () => {
      mockTx.libraryArtist.update.mockResolvedValue(mockLibraryArtist);
      const data = { updatedAt: new Date() };
      const result = await repository.update('la-123', data);
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.update).toHaveBeenCalledWith({ data, where: { id: 'la-123' } });
    });
  });

  describe('delete', () => {
    it('should delete a library artist', async () => {
      mockTx.libraryArtist.delete.mockResolvedValue(mockLibraryArtist);
      const result = await repository.delete('la-123');
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.delete).toHaveBeenCalledWith({ where: { id: 'la-123' } });
    });
  });

  describe('deleteByLibraryIdAndArtistId', () => {
    it('should delete by library id and artist id', async () => {
      mockTx.libraryArtist.delete.mockResolvedValue(mockLibraryArtist);
      const result = await repository.deleteByLibraryIdAndArtistId('lib-123', 'artist-123');
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.delete).toHaveBeenCalledWith({
        where: {
          libraryId_artistId: {
            libraryId: 'lib-123',
            artistId: 'artist-123',
          },
        },
      });
    });
  });

  describe('deleteAllFromLibrary', () => {
    it('should delete all from library', async () => {
      mockTx.libraryArtist.deleteMany.mockResolvedValue({ count: 5 });
      await repository.deleteAllFromLibrary('lib-123');
      expect(mockTx.libraryArtist.deleteMany).toHaveBeenCalledWith({
        where: { libraryId: 'lib-123' },
      });
    });
  });
});
