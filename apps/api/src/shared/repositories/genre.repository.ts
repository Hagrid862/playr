import { Injectable } from '@nestjs/common';
import {
  Genre,
  GenreCreateInput,
  GenreGetPayload,
  GenreKind,
  GenreOrderByWithRelationInput,
  GenreUpdateInput,
  GenreWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';
@Injectable()
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}
  private libraryListWhere(libraryId: string, q?: string, kind?: GenreKind): GenreWhereInput {
    const visibility: GenreWhereInput = {
      deletedAt: null,
      OR: [{ libraryId: null }, { libraryId }],
    };
    const conditions: GenreWhereInput[] = [visibility];
    if (kind) {
      conditions.push({ kind });
    }
    if (q?.trim()) {
      const term = q.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    return conditions.length === 1 ? conditions[0]! : { AND: conditions };
  }

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Genre | null>;
  async getById<T extends Prisma.GenreInclude>(
    id: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    const row = await this.prisma.client.genre.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }
  async getGenreForLibrary(genreId: string, libraryId: string): Promise<Genre | null>;
  async getGenreForLibrary<T extends Prisma.GenreInclude>(
    genreId: string,
    libraryId: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  /**
   * Gets a genre that is available to the provided library.
   * @param genreId genreId to match.
   * @param libraryId libraryId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getGenreForLibrary(
    genreId: string,
    libraryId: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        id: genreId,
        deletedAt: null,
        OR: [{ libraryId: null }, { libraryId }],
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getSystemGenreBySlug(slug: string): Promise<Genre | null>;
  async getSystemGenreBySlug<T extends Prisma.GenreInclude>(
    slug: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  /**
   * Gets a system genre by its slug.
   * @param slug Slug value to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getSystemGenreBySlug(
    slug: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        libraryId: null,
        slug,
        kind: 'system',
        deletedAt: null,
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getCustomGenreBySlugForLibrary(libraryId: string, slug: string): Promise<Genre | null>;
  async getCustomGenreBySlugForLibrary<T extends Prisma.GenreInclude>(
    libraryId: string,
    slug: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  /**
   * Gets a custom genre by slug for the provided library.
   * @param libraryId libraryId to match.
   * @param slug Slug value to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getCustomGenreBySlugForLibrary(
    libraryId: string,
    slug: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        libraryId,
        slug,
        kind: 'custom',
        deletedAt: null,
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async getGenreBySlugForLibrary(
    libraryId: string,
    slug: string,
    options?: { excludeGenreId?: string },
  ): Promise<Genre | null>;
  async getGenreBySlugForLibrary<T extends Prisma.GenreInclude>(
    libraryId: string,
    slug: string,
    options: { excludeGenreId?: string; include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  /**
   * Gets a genre by slug for the provided library.
   * @param libraryId libraryId to match.
   * @param slug Slug value to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getGenreBySlugForLibrary(
    libraryId: string,
    slug: string,
    options?: { excludeGenreId?: string; include?: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        libraryId,
        slug,
        deletedAt: null,
        ...(options?.excludeGenreId ? { NOT: { id: options.excludeGenreId } } : {}),
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: GenreWhereInput,
    orderBy?: GenreOrderByWithRelationInput,
  ): Promise<Genre[]>;
  async getPaginated<T extends Prisma.GenreInclude>(
    page: number,
    limit: number,
    filter: GenreWhereInput | undefined,
    orderBy: GenreOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getPaginated(
    page: number,
    limit: number,
    filter?: GenreWhereInput,
    orderBy?: GenreOrderByWithRelationInput,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    const w = filter;
    return await this.prisma.client.genre.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...w,
        deletedAt: w && 'deletedAt' in w && w.deletedAt !== undefined ? w.deletedAt : null,
      },
      orderBy: orderBy ?? { createdAt: 'desc' },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async getGenresPaginatedForLibrary(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
    page: number;
    limit: number;
  }): Promise<Genre[]>;
  async getGenresPaginatedForLibrary<T extends Prisma.GenreInclude>(
    options: {
      libraryId: string;
      q?: string;
      kind?: GenreKind;
      page: number;
      limit: number;
    } & { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  /**
   * Returns a paginated list of genres for the provided library.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getGenresPaginatedForLibrary(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
    page: number;
    limit: number;
    include?: Prisma.GenreInclude;
  }): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    const { libraryId, q, kind, page, limit, include } = options;
    const skip = (page - 1) * limit;
    return await this.prisma.client.genre.findMany({
      where: this.libraryListWhere(libraryId, q, kind),
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      ...(include ? { include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────
  /**
   * Counts genres available to the provided library.
   * @param options Optional include or query options.
   * @returns Number of matching records.
   */
  async countGenresForLibrary(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
  }): Promise<number> {
    const { libraryId, q, kind } = options;
    return await this.prisma.client.genre.count({
      where: this.libraryListWhere(libraryId, q, kind),
    });
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: GenreWhereInput): Promise<number> {
    return await this.prisma.client.genre.count({
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
    });
  }
  /**
   * Checks whether a matching record currently exists.
   * @param id Record identifier.
   * @returns True when a matching record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.genre.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Checks whether all genre IDs can be assigned to the provided library.
   * @param libraryId libraryId to match.
   * @param genreIds Genre IDs to validate for assignment.
   * @returns True when every genre is non-deleted and either system-level or belongs to the library.
   */
  async areGenreIdsAssignableToLibrary(libraryId: string, genreIds: string[]): Promise<boolean> {
    if (genreIds.length === 0) {
      return true;
    }
    const unique = [...new Set(genreIds)];
    const matchCount = await this.prisma.client.genre.count({
      where: {
        id: { in: unique },
        deletedAt: null,
        OR: [{ libraryId: null }, { libraryId }],
      },
    });
    return matchCount === unique.length;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: GenreCreateInput): Promise<Genre>;
  async create<T extends Prisma.GenreInclude>(
    data: GenreCreateInput,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: GenreCreateInput,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }>> {
    return await this.prisma.client.genre.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.GenreCreateManyInput[]): Promise<Genre[]>;
  async createMany<T extends Prisma.GenreInclude>(
    data: Prisma.GenreCreateManyInput[],
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.GenreCreateManyInput[],
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    return await this.prisma.client.genre.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: GenreUpdateInput): Promise<Genre>;
  async update<T extends Prisma.GenreInclude>(
    id: string,
    data: GenreUpdateInput,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>>;
  /**
   * Updates an existing record with the provided data.
   * @param id Record identifier.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async update(
    id: string,
    data: GenreUpdateInput,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }>> {
    return await this.prisma.client.genre.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: GenreUpdateInput }[]): Promise<Genre[]>;
  async updateMany<T extends Prisma.GenreInclude>(
    updates: { id: string; data: GenreUpdateInput }[],
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: GenreUpdateInput }[],
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.genre.update({
          where: { id },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────
  /**
   * Permanently deletes a single record by ID.
   * @param id Record identifier.
   * @returns Deleted record.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async delete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  /**
   * Permanently deletes multiple records by their IDs.
   * @param ids Record identifiers to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteMany(ids: string[]): Promise<Genre[]> {
    if (ids.length === 0) {
      return [];
    }
    const genres = await this.prisma.client.genre.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.genre.deleteMany({
      where: { id: { in: ids } },
    });
    return genres;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Genre[]> {
    if (ids.length === 0) {
      return [];
    }
    const genres = await this.prisma.client.genre.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.genre.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return genres;
  }
}
