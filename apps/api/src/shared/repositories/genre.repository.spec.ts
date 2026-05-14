import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenreRepository } from './genre.repository';
import { PrismaService } from '../services/prisma.service';
import { Genre, GenreKind, Prisma } from '@repo/db';

describe('GenreRepository', () => {
  let repository: GenreRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    genre: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  beforeEach(() => {
    mockPrismaClient = createMockPrismaClient();
    mockMainClient = createMockPrismaClient();

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
      get mainClient() {
        return mockMainClient;
      },
    } as unknown as PrismaService;

    prismaService = mockPrismaService;
    repository = new GenreRepository(prismaService);
  });

  const mockGenre: Genre = {
    id: 'genre-1',
    name: 'Rock',
    description: null,
    slug: 'rock',
    kind: GenreKind.system,
    libraryId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockCustomGenre: Genre = {
    ...mockGenre,
    id: 'genre-2',
    name: 'Custom Rock',
    slug: 'custom-rock',
    kind: GenreKind.custom,
    libraryId: 'library-1',
  };

  describe('getById', () => {
    it('should return genre by id without include', async () => {
      mockPrismaClient.genre.findUnique.mockResolvedValue(mockGenre);

      const result = await repository.getById('genre-1');

      expect(result).toEqual(mockGenre);
      expect(mockPrismaClient.genre.findUnique).toHaveBeenCalledWith({
        where: { id: 'genre-1' },
      });
    });

    it('should return genre by id with include', async () => {
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.findUnique.mockResolvedValue(genreWithInclude as unknown as Genre);

      const result = await repository.getById('genre-1', { include: { tracks: true } });

      expect(result).toEqual(genreWithInclude);
      expect(mockPrismaClient.genre.findUnique).toHaveBeenCalledWith({
        where: { id: 'genre-1' },
        include: { tracks: true },
      });
    });

    it('should return null if genre not found', async () => {
      mockPrismaClient.genre.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if genre is soft-deleted', async () => {
      mockPrismaClient.genre.findUnique.mockResolvedValue({
        ...mockGenre,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('genre-1');

      expect(result).toBeNull();
    });
  });

  describe('getGenreForLibrary', () => {
    it('should return system genre for library without include', async () => {
      mockPrismaClient.genre.findFirst.mockResolvedValue(mockGenre);

      const result = await repository.getGenreForLibrary('genre-1', 'library-1');

      expect(result).toEqual(mockGenre);
      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'genre-1',
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
      });
    });

    it('should return custom genre for library', async () => {
      mockPrismaClient.genre.findFirst.mockResolvedValue(mockCustomGenre);

      const result = await repository.getGenreForLibrary('genre-2', 'library-1');

      expect(result).toEqual(mockCustomGenre);
    });

    it('should return genre for library with include', async () => {
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.findFirst.mockResolvedValue(genreWithInclude as unknown as Genre);

      await repository.getGenreForLibrary('genre-1', 'library-1', { include: { tracks: true } });

      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'genre-1',
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
        include: { tracks: true },
      });
    });
  });

  describe('getSystemGenreBySlug', () => {
    it('should return system genre by slug without include', async () => {
      mockPrismaClient.genre.findFirst.mockResolvedValue(mockGenre);

      const result = await repository.getSystemGenreBySlug('rock');

      expect(result).toEqual(mockGenre);
      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: null,
          slug: 'rock',
          kind: GenreKind.system,
          deletedAt: null,
        },
      });
    });

    it('should return system genre by slug with include', async () => {
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.findFirst.mockResolvedValue(genreWithInclude as unknown as Genre);

      await repository.getSystemGenreBySlug('rock', { include: { tracks: true } });

      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: null,
          slug: 'rock',
          kind: GenreKind.system,
          deletedAt: null,
        },
        include: { tracks: true },
      });
    });
  });

  describe('getCustomGenreBySlugForLibrary', () => {
    it('should return custom genre by slug for library without include', async () => {
      mockPrismaClient.genre.findFirst.mockResolvedValue(mockCustomGenre);

      const result = await repository.getCustomGenreBySlugForLibrary('library-1', 'custom-rock');

      expect(result).toEqual(mockCustomGenre);
      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          slug: 'custom-rock',
          kind: GenreKind.custom,
          deletedAt: null,
        },
      });
    });

    it('should return custom genre by slug for library with include', async () => {
      const genreWithInclude = { ...mockCustomGenre, tracks: [] };
      mockPrismaClient.genre.findFirst.mockResolvedValue(genreWithInclude as unknown as Genre);

      await repository.getCustomGenreBySlugForLibrary('library-1', 'custom-rock', {
        include: { tracks: true },
      });

      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          slug: 'custom-rock',
          kind: GenreKind.custom,
          deletedAt: null,
        },
        include: { tracks: true },
      });
    });
  });

  describe('getGenreBySlugForLibrary', () => {
    it('should return genre by slug for library without exclude', async () => {
      mockPrismaClient.genre.findFirst.mockResolvedValue(mockCustomGenre);

      const result = await repository.getGenreBySlugForLibrary('library-1', 'custom-rock');

      expect(result).toEqual(mockCustomGenre);
      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          slug: 'custom-rock',
          deletedAt: null,
        },
      });
    });

    it('should return genre by slug for library with excludeGenreId', async () => {
      mockPrismaClient.genre.findFirst.mockResolvedValue(mockCustomGenre);

      await repository.getGenreBySlugForLibrary('library-1', 'custom-rock', {
        excludeGenreId: 'genre-3',
      });

      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          slug: 'custom-rock',
          deletedAt: null,
          NOT: { id: 'genre-3' },
        },
      });
    });

    it('should return genre by slug for library with include', async () => {
      const genreWithInclude = { ...mockCustomGenre, tracks: [] };
      mockPrismaClient.genre.findFirst.mockResolvedValue(genreWithInclude as unknown as Genre);

      await repository.getGenreBySlugForLibrary('library-1', 'custom-rock', {
        include: { tracks: true },
      });

      expect(mockPrismaClient.genre.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          slug: 'custom-rock',
          deletedAt: null,
        },
        include: { tracks: true },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated genres without filter or orderBy', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockGenre]);
      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated genres with filter and orderBy', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);
      const filter = { name: 'Rock' };
      const orderBy = { name: 'asc' } as Prisma.GenreOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockGenre]);
      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { name: 'Rock', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('should return paginated genres with deletedAt filter', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);
      const filter = { deletedAt: new Date('2024-01-02') };

      await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated genres with include', async () => {
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.findMany.mockResolvedValue([genreWithInclude] as unknown as Genre[]);

      await repository.getPaginated(1, 10, undefined, undefined, { include: { tracks: true } });

      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { tracks: true },
      });
    });
  });

  describe('getGenresPaginatedForLibrary', () => {
    it('should return genres paginated for library without filters', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);

      const result = await repository.getGenresPaginatedForLibrary({
        libraryId: 'library-1',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual([mockGenre]);
      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('should return genres paginated for library with kind filter', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);

      await repository.getGenresPaginatedForLibrary({
        libraryId: 'library-1',
        kind: GenreKind.system,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              deletedAt: null,
              OR: [{ libraryId: null }, { libraryId: 'library-1' }],
            },
            { kind: GenreKind.system },
          ],
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('should return genres paginated for library with search query', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);

      await repository.getGenresPaginatedForLibrary({
        libraryId: 'library-1',
        q: 'rock',
        page: 1,
        limit: 10,
      });

      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              deletedAt: null,
              OR: [{ libraryId: null }, { libraryId: 'library-1' }],
            },
            {
              OR: [
                { name: { contains: 'rock', mode: 'insensitive' } },
                { slug: { contains: 'rock', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('should return genres paginated for library with all filters', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);

      await repository.getGenresPaginatedForLibrary({
        libraryId: 'library-1',
        q: 'rock',
        kind: GenreKind.system,
        page: 2,
        limit: 5,
      });

      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              deletedAt: null,
              OR: [{ libraryId: null }, { libraryId: 'library-1' }],
            },
            { kind: GenreKind.system },
            {
              OR: [
                { name: { contains: 'rock', mode: 'insensitive' } },
                { slug: { contains: 'rock', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { name: 'asc' },
        skip: 5,
        take: 5,
      });
    });

    it('should return genres with include', async () => {
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.findMany.mockResolvedValue([genreWithInclude] as unknown as Genre[]);

      await repository.getGenresPaginatedForLibrary({
        libraryId: 'library-1',
        page: 1,
        limit: 10,
        include: { tracks: true },
      });

      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
        include: { tracks: true },
      });
    });
  });

  describe('countGenresForLibrary', () => {
    it('should count genres for library without filters', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(10);

      const result = await repository.countGenresForLibrary({ libraryId: 'library-1' });

      expect(result).toBe(10);
      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
      });
    });

    it('should count genres for library with kind filter', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(5);

      await repository.countGenresForLibrary({
        libraryId: 'library-1',
        kind: GenreKind.system,
      });

      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { deletedAt: null, OR: [{ libraryId: null }, { libraryId: 'library-1' }] },
            { kind: GenreKind.system },
          ],
        },
      });
    });

    it('should count genres for library with search query', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(3);

      await repository.countGenresForLibrary({
        libraryId: 'library-1',
        q: 'rock',
      });

      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { deletedAt: null, OR: [{ libraryId: null }, { libraryId: 'library-1' }] },
            {
              OR: [
                { name: { contains: 'rock', mode: 'insensitive' } },
                { slug: { contains: 'rock', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });
    });

    it('should trim search query', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(3);

      await repository.countGenresForLibrary({
        libraryId: 'library-1',
        q: '  rock  ',
      });

      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { deletedAt: null, OR: [{ libraryId: null }, { libraryId: 'library-1' }] },
            {
              OR: [
                { name: { contains: 'rock', mode: 'insensitive' } },
                { slug: { contains: 'rock', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });
    });
  });

  describe('count', () => {
    it('should count genres without filter', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count genres with filter', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(3);
      const filter = { name: 'Rock' };

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: { name: 'Rock', deletedAt: null },
      });
    });

    it('should count genres with deletedAt filter', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('exists', () => {
    it('should return true if genre exists', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(1);

      const result = await repository.exists('genre-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: { id: 'genre-1', deletedAt: null },
      });
    });

    it('should return false if genre does not exist', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(0);

      const result = await repository.exists('genre-1');

      expect(result).toBe(false);
    });
  });

  describe('areGenreIdsAssignableToLibrary', () => {
    it('should return true for empty genreIds', async () => {
      const result = await repository.areGenreIdsAssignableToLibrary('library-1', []);

      expect(result).toBe(true);
      expect(mockPrismaClient.genre.count).not.toHaveBeenCalled();
    });

    it('should return true when all genreIds are assignable', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(2);

      const result = await repository.areGenreIdsAssignableToLibrary('library-1', [
        'genre-1',
        'genre-2',
      ]);

      expect(result).toBe(true);
      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['genre-1', 'genre-2'] },
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
      });
    });

    it('should remove duplicates from genreIds', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(2);

      await repository.areGenreIdsAssignableToLibrary('library-1', [
        'genre-1',
        'genre-1',
        'genre-2',
      ]);

      expect(mockPrismaClient.genre.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['genre-1', 'genre-2'] },
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'library-1' }],
        },
      });
    });

    it('should return false when some genreIds are not assignable', async () => {
      mockPrismaClient.genre.count.mockResolvedValue(1);

      const result = await repository.areGenreIdsAssignableToLibrary('library-1', [
        'genre-1',
        'genre-2',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create genre without include', async () => {
      const createInput = {
        name: 'Jazz',
        slug: 'jazz',
        kind: GenreKind.custom,
      } as Prisma.GenreCreateInput;
      mockPrismaClient.genre.create.mockResolvedValue(mockGenre);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockGenre);
      expect(mockPrismaClient.genre.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create genre with include', async () => {
      const createInput = {
        name: 'Jazz',
        slug: 'jazz',
        kind: GenreKind.custom,
      } as Prisma.GenreCreateInput;
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.create.mockResolvedValue(genreWithInclude as unknown as Genre);

      const result = await repository.create(createInput, { include: { tracks: true } });

      expect(result).toEqual(genreWithInclude);
      expect(mockPrismaClient.genre.create).toHaveBeenCalledWith({
        data: createInput,
        include: { tracks: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many genres without include', async () => {
      const createInputs = [
        { name: 'Jazz', slug: 'jazz', kind: GenreKind.custom },
        { name: 'Blues', slug: 'blues', kind: GenreKind.custom },
      ] as Prisma.GenreCreateManyInput[];
      mockPrismaClient.genre.createManyAndReturn.mockResolvedValue([mockGenre]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockGenre]);
      expect(mockPrismaClient.genre.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many genres with include', async () => {
      const createInputs = [
        { name: 'Jazz', slug: 'jazz', kind: GenreKind.custom },
      ] as Prisma.GenreCreateManyInput[];
      const genresWithInclude = [{ ...mockGenre, tracks: [] }];
      mockPrismaClient.genre.createManyAndReturn.mockResolvedValue(
        genresWithInclude as unknown as Genre[],
      );

      await repository.createMany(createInputs, { include: { tracks: true } });

      expect(mockPrismaClient.genre.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { tracks: true },
      });
    });
  });

  describe('update', () => {
    it('should update genre without include', async () => {
      const updateInput = { name: 'Updated Rock' } as Prisma.GenreUpdateInput;
      mockPrismaClient.genre.update.mockResolvedValue(mockGenre);

      const result = await repository.update('genre-1', updateInput);

      expect(result).toEqual(mockGenre);
      expect(mockPrismaClient.genre.update).toHaveBeenCalledWith({
        where: { id: 'genre-1' },
        data: updateInput,
      });
    });

    it('should update genre with include', async () => {
      const updateInput = { name: 'Updated Rock' } as Prisma.GenreUpdateInput;
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockPrismaClient.genre.update.mockResolvedValue(genreWithInclude as unknown as Genre);

      await repository.update('genre-1', updateInput, { include: { tracks: true } });

      expect(mockPrismaClient.genre.update).toHaveBeenCalledWith({
        where: { id: 'genre-1' },
        data: updateInput,
        include: { tracks: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many genres without include', async () => {
      const updates = [
        { id: 'genre-1', data: { name: 'Updated 1' } as Prisma.GenreUpdateInput },
        { id: 'genre-2', data: { name: 'Updated 2' } as Prisma.GenreUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.genre.update.mockResolvedValue(mockGenre);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many genres with include', async () => {
      const updates = [{ id: 'genre-1', data: { name: 'Updated 1' } as Prisma.GenreUpdateInput }];
      const genreWithInclude = { ...mockGenre, tracks: [] };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.genre.update.mockResolvedValue(genreWithInclude as unknown as Genre);

      await repository.updateMany(updates, { include: { tracks: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete genre', async () => {
      mockPrismaClient.genre.delete.mockResolvedValue(mockGenre);

      const result = await repository.delete('genre-1');

      expect(result).toEqual(mockGenre);
      expect(mockPrismaClient.genre.delete).toHaveBeenCalledWith({
        where: { id: 'genre-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete genre', async () => {
      const deletedGenre = { ...mockGenre, deletedAt: new Date() };
      mockPrismaClient.genre.update.mockResolvedValue(deletedGenre);

      const result = await repository.softDelete('genre-1');

      expect(result).toEqual(deletedGenre);
      expect(mockPrismaClient.genre.update).toHaveBeenCalledWith({
        where: { id: 'genre-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.genre.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many genres', async () => {
      mockPrismaClient.genre.findMany.mockResolvedValue([mockGenre]);
      mockPrismaClient.genre.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['genre-1', 'genre-2']);

      expect(result).toEqual([mockGenre]);
      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['genre-1', 'genre-2'] } },
      });
      expect(mockPrismaClient.genre.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['genre-1', 'genre-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.genre.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many genres', async () => {
      const genresToDelete = [
        { ...mockGenre, id: 'genre-1' },
        { ...mockGenre, id: 'genre-2' },
      ];
      mockPrismaClient.genre.findMany.mockResolvedValue(genresToDelete);
      mockPrismaClient.genre.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['genre-1', 'genre-2']);

      expect(result).toEqual(genresToDelete);
      expect(mockPrismaClient.genre.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['genre-1', 'genre-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.genre.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['genre-1', 'genre-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
