import { GenreRepository } from '@/shared/repositories/genre.repository';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Genre } from '@repo/db';
import { GenreNormalizationService } from './genre-normalization.service';

/**
 * Resolves raw tag strings to `Genre` rows: system genres first, then library custom,
 * creating custom genres when missing (display name = first seen raw string per match key).
 */
@Injectable()
export class GenreResolutionService {
  constructor(
    private readonly genreRepository: GenreRepository,
    private readonly normalization: GenreNormalizationService,
  ) {}

  /**
   * Creates or returns an existing custom genre in the library for this display name
   * (idempotent on same normalized slug within the library).
   */
  async ensureCustomGenre(libraryId: string, displayName: string): Promise<Genre> {
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new BadRequestException('Genre name is required');
    }

    const baseSlug = this.normalization.normalizeToMatchKey(trimmed);
    if (!baseSlug) {
      throw new BadRequestException('Genre name must contain at least one letter or number');
    }

    const existingCustom = await this.genreRepository.findOne({
      libraryId,
      slug: baseSlug,
      deletedAt: null,
    });
    if (existingCustom) {
      return existingCustom;
    }

    const slug = await this.allocateUniqueSlugInLibrary(libraryId, baseSlug);

    return await this.genreRepository.create({
      name: trimmed,
      slug,
      kind: 'custom',
      library: { connect: { id: libraryId } },
    });
  }

  /**
   * Maps raw metadata (one or more strings, possibly with `;`/`/` separators) to genre ids.
   * Order preserved; duplicates (same match key) collapse to one id.
   */
  async resolveRawTagsToGenreIds(
    libraryId: string,
    raw: string | readonly string[],
  ): Promise<string[]> {
    const segments = this.normalization.flattenRawGenreInput(raw);
    const firstSeenDisplay = new Map<string, string>();
    const orderedKeys: string[] = [];

    for (const segment of segments) {
      const key = this.normalization.normalizeToMatchKey(segment);
      if (!key) {
        continue;
      }
      if (!firstSeenDisplay.has(key)) {
        firstSeenDisplay.set(key, segment.trim());
        orderedKeys.push(key);
      }
    }

    const ids: string[] = [];
    for (const matchKey of orderedKeys) {
      const display = firstSeenDisplay.get(matchKey)!;
      const genre = await this.resolveOneTag(libraryId, matchKey, display);
      ids.push(genre.id);
    }

    return ids;
  }

  private async resolveOneTag(
    libraryId: string,
    matchKey: string,
    displayForCreate: string,
  ): Promise<Genre> {
    const system = await this.genreRepository.findOne({
      libraryId: null,
      slug: matchKey,
      kind: 'system',
      deletedAt: null,
    });
    if (system) {
      return system;
    }

    const existingCustom = await this.genreRepository.findOne({
      libraryId,
      slug: matchKey,
      deletedAt: null,
    });
    if (existingCustom) {
      return existingCustom;
    }

    const slug = await this.allocateUniqueSlugInLibrary(libraryId, matchKey);

    return await this.genreRepository.create({
      name: displayForCreate,
      slug,
      kind: 'custom',
      library: { connect: { id: libraryId } },
    });
  }

  private async allocateUniqueSlugInLibrary(libraryId: string, baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;

    while (
      await this.genreRepository.findOne({
        libraryId,
        slug,
        deletedAt: null,
      })
    ) {
      suffix += 1;
      slug = `${baseSlug}${suffix}`;
      if (suffix > 1000) {
        throw new ConflictException('Could not allocate a unique genre slug');
      }
    }

    return slug;
  }
}
