import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GenreNormalizationService } from './genre-normalization.service';
import { GenreResolutionService } from './genre-resolution.service';

const prismaUnique = () => Object.assign(new Error('unique'), { code: 'P2002' });

describe('GenreResolutionService', () => {
  let service: GenreResolutionService;
  let genreRepository: DeepMocked<GenreRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;

  const libraryId = 'lib-1';
  const userId = 'user-1';
  const library = libraryBuilder({ id: libraryId, userId });

  const customGenre = {
    id: 'cg1',
    name: 'My Rock',
    slug: 'myrock',
    kind: 'custom' as const,
    libraryId,
  } as any;

  beforeEach(async () => {
    genreRepository = createMock<GenreRepository>();
    libraryRepository = createMock<LibraryRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreResolutionService,
        { provide: GenreRepository, useValue: genreRepository },
        { provide: GenreNormalizationService, useClass: GenreNormalizationService },
        { provide: LibraryRepository, useValue: libraryRepository },
      ],
    }).compile();

    service = module.get(GenreResolutionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureCustomGenre', () => {
    it('throws when display name is empty', async () => {
      await expect(service.ensureCustomGenre(libraryId, '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when normalized slug is empty', async () => {
      await expect(service.ensureCustomGenre(libraryId, '@@@')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns existing custom genre without creating', async () => {
      genreRepository.findOne.mockResolvedValue(customGenre);
      const result = await service.ensureCustomGenre(libraryId, 'My Rock');
      expect(result).toBe(customGenre);
      expect(genreRepository.create).not.toHaveBeenCalled();
    });

    it('creates when no existing row', async () => {
      genreRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      genreRepository.create.mockResolvedValue(customGenre);

      const result = await service.ensureCustomGenre(libraryId, 'My Rock');

      expect(result).toBe(customGenre);
      expect(genreRepository.create).toHaveBeenCalled();
    });

    it('recovers from P2002 when another request created the row', async () => {
      genreRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(customGenre);
      genreRepository.create.mockRejectedValue(prismaUnique());

      const result = await service.ensureCustomGenre(libraryId, 'My Rock');

      expect(result).toBe(customGenre);
    });

    it('rethrows P2002 when recovery findOne returns null', async () => {
      const err = prismaUnique();
      genreRepository.findOne.mockResolvedValue(null);
      genreRepository.create.mockRejectedValue(err);

      await expect(service.ensureCustomGenre(libraryId, 'Unique Name Here')).rejects.toBe(err);
    });

    it('rethrows non-unique errors from create', async () => {
      const err = new Error('db down');
      genreRepository.findOne.mockResolvedValue(null);
      genreRepository.create.mockRejectedValue(err);

      await expect(service.ensureCustomGenre(libraryId, 'Brand New')).rejects.toThrow('db down');
    });
  });

  describe('resolveRawTagsToGenreIds', () => {
    it('skips segments that normalize to empty keys', async () => {
      genreRepository.findOne.mockImplementation(async (where: any) => {
        if (where.libraryId === null && where.kind === 'system') {
          return { id: 'sys-rock', slug: 'rock' } as any;
        }
        return null;
      });
      genreRepository.create.mockResolvedValue({ id: 'new1' } as any);

      const ids = await service.resolveRawTagsToGenreIds(libraryId, ['Rock', '@@@', 'Rock']);

      expect(ids).toEqual(['sys-rock']);
    });

    it('preserves order and collapses duplicate keys', async () => {
      let systemCalls = 0;
      genreRepository.findOne.mockImplementation(async (where: any) => {
        if (where.libraryId === null && where.kind === 'system') {
          systemCalls += 1;
          if (where.slug === 'rock') return { id: 's1', slug: 'rock' } as any;
          if (where.slug === 'jazz') return { id: 's2', slug: 'jazz' } as any;
        }
        return null;
      });

      const ids = await service.resolveRawTagsToGenreIds(libraryId, 'Rock; Jazz/Rock');

      expect(ids).toEqual(['s1', 's2']);
      expect(systemCalls).toBeGreaterThan(0);
    });

    it('creates custom genre when no system match and recovers on P2002', async () => {
      const created = { id: 'cust1', slug: 'newtag' } as any;
      genreRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      genreRepository.create.mockRejectedValueOnce(prismaUnique());

      const ids = await service.resolveRawTagsToGenreIds(libraryId, 'NewTag');

      expect(ids).toEqual(['cust1']);
    });

    it('returns existing library custom when system misses but slug exists in library', async () => {
      const existing = {
        id: 'existing-custom',
        slug: 'onlycustomgenre',
        kind: 'custom' as const,
        libraryId,
      } as any;
      genreRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);

      const ids = await service.resolveRawTagsToGenreIds(libraryId, 'OnlyCustomGenre');

      expect(ids).toEqual(['existing-custom']);
      expect(genreRepository.create).not.toHaveBeenCalled();
    });

    it('rethrows non-unique errors from create in resolveOneTag', async () => {
      const err = new Error('db fail');
      genreRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      genreRepository.create.mockRejectedValueOnce(err);

      await expect(service.resolveRawTagsToGenreIds(libraryId, 'ZetaUniqueTag')).rejects.toThrow(
        'db fail',
      );
    });

    it('rethrows P2002 when recovery findOne returns null in resolveOneTag', async () => {
      const err = prismaUnique();
      genreRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      genreRepository.create.mockRejectedValueOnce(err);

      await expect(service.resolveRawTagsToGenreIds(libraryId, 'OmegaUniqueTag')).rejects.toBe(err);
    });
  });

  describe('assertEditableCustomGenreForUser', () => {
    it('throws PreconditionFailedException when library missing', async () => {
      libraryRepository.findOne.mockResolvedValue(null);
      await expect(service.assertEditableCustomGenreForUser('g1', userId)).rejects.toThrow(
        PreconditionFailedException,
      );
    });

    it('throws NotFoundException when genre missing', async () => {
      libraryRepository.findOne.mockResolvedValue(library as any);
      genreRepository.findOne.mockResolvedValue(null);
      await expect(service.assertEditableCustomGenreForUser('g1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when not custom or wrong library', async () => {
      libraryRepository.findOne.mockResolvedValue(library as any);
      genreRepository.findOne.mockResolvedValue({
        id: 'g1',
        kind: 'system',
        libraryId: null,
      } as any);
      await expect(service.assertEditableCustomGenreForUser('g1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns genre when valid custom row', async () => {
      libraryRepository.findOne.mockResolvedValue(library as any);
      genreRepository.findOne.mockResolvedValue(customGenre);
      const result = await service.assertEditableCustomGenreForUser(customGenre.id, userId);
      expect(result).toBe(customGenre);
    });

    it('uses custom forbidden message', async () => {
      libraryRepository.findOne.mockResolvedValue(library as any);
      genreRepository.findOne.mockResolvedValue({
        id: 'g1',
        kind: 'system',
        libraryId: null,
      } as any);
      await expect(
        service.assertEditableCustomGenreForUser('g1', userId, 'Custom msg'),
      ).rejects.toThrow('Custom msg');
    });
  });

  describe('allocateUniqueSlugForLibraryRename', () => {
    it('throws when display name empty', async () => {
      await expect(
        service.allocateUniqueSlugForLibraryRename(libraryId, '   ', 'g1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when base slug empty', async () => {
      await expect(
        service.allocateUniqueSlugForLibraryRename(libraryId, '@@@', 'g1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns base slug when free', async () => {
      genreRepository.findOne.mockResolvedValue(null);
      const slug = await service.allocateUniqueSlugForLibraryRename(libraryId, 'Fresh Name', 'g1');
      expect(slug).toMatch(/freshname/);
    });
  });

  describe('allocateUniqueSlugInLibrary (via rename)', () => {
    it('appends suffix when base slug conflicts', async () => {
      genreRepository.findOne
        .mockResolvedValueOnce({ id: 'other' } as any)
        .mockResolvedValueOnce(null);
      const slug = await service.allocateUniqueSlugForLibraryRename(libraryId, 'Taken', 'g99');
      expect(slug).toContain('taken');
      expect(slug).not.toBe('taken');
    });

    it('merges NOT filter when ignoreGenreId is set', async () => {
      genreRepository.findOne.mockResolvedValue(null);
      await service.allocateUniqueSlugForLibraryRename(libraryId, 'Only', 'genre-self');
      expect(genreRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          NOT: { id: 'genre-self' },
        }),
      );
    });

    it('throws ConflictException when suffix exceeds 1000', async () => {
      genreRepository.findOne.mockResolvedValue({ id: 'x' } as any);
      await expect(
        service.allocateUniqueSlugForLibraryRename(libraryId, 'Collision', 'g1'),
      ).rejects.toThrow(ConflictException);
      expect(genreRepository.findOne.mock.calls.length).toBeGreaterThan(1000);
    });
  });
});
