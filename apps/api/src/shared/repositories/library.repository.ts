import { Injectable } from '@nestjs/common';
import {
  Library,
  LibraryCreateInput,
  LibraryGetPayload,
  LibraryOrderByWithRelationInput,
  LibraryUpdateInput,
  LibraryWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Library | null>;
  async getById<T extends Prisma.LibraryInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }> | null> {
    const row = await this.prisma.client.library.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByUserId(userId: string): Promise<Library | null>;
  async getByUserId<T extends Prisma.LibraryInclude>(
    userId: string,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by the provided user ID.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByUserId(
    userId: string,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }> | null> {
    const row = await this.prisma.client.library.findUnique({
      where: { userId },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryWhereInput,
    orderBy?: LibraryOrderByWithRelationInput,
  ): Promise<Library[]>;
  async getPaginated<T extends Prisma.LibraryInclude>(
    page: number,
    limit: number,
    filter: LibraryWhereInput | undefined,
    orderBy: LibraryOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>[]>;
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
    filter?: LibraryWhereInput,
    orderBy?: LibraryOrderByWithRelationInput,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library[] | LibraryGetPayload<{ include: Prisma.LibraryInclude }>[]> {
    return await this.prisma.client.library.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────
  /**
   * Checks whether a matching record currently exists.
   * @param id Record identifier.
   * @returns True when a matching record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.library.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Checks whether a record exists for the provided user.
   * @param userId userId to match.
   * @returns True when a matching record exists.
   */
  async existsForUser(userId: string): Promise<boolean> {
    const count = await this.prisma.client.library.count({
      where: { userId, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: LibraryWhereInput): Promise<number> {
    return await this.prisma.client.library.count({
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryCreateInput): Promise<Library>;
  async create<T extends Prisma.LibraryInclude>(
    data: LibraryCreateInput,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: LibraryCreateInput,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }>> {
    return await this.prisma.client.library.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryCreateManyInput[]): Promise<Library[]>;
  async createMany<T extends Prisma.LibraryInclude>(
    data: Prisma.LibraryCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.LibraryCreateManyInput[],
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library[] | LibraryGetPayload<{ include: Prisma.LibraryInclude }>[]> {
    return await this.prisma.client.library.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryUpdateInput): Promise<Library>;
  async update<T extends Prisma.LibraryInclude>(
    id: string,
    data: LibraryUpdateInput,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>>;
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
    data: LibraryUpdateInput,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }>> {
    return await this.prisma.client.library.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: LibraryUpdateInput }[]): Promise<Library[]>;
  async updateMany<T extends Prisma.LibraryInclude>(
    updates: { id: string; data: LibraryUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: LibraryUpdateInput }[],
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library[] | LibraryGetPayload<{ include: Prisma.LibraryInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.library.update({
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
  async delete(id: string): Promise<Library> {
    return await this.prisma.client.library.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Library> {
    return await this.prisma.client.library.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  /**
   * Permanently deletes a record by user ID.
   * @param userId userId to match.
   * @returns Deleted record.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteByUserId(userId: string): Promise<Library> {
    return await this.prisma.client.library.delete({ where: { userId } });
  }
  /**
   * Permanently deletes multiple records by their IDs.
   * @param ids Record identifiers to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteMany(ids: string[]): Promise<Library[]> {
    if (ids.length === 0) {
      return [];
    }
    const libraries = await this.prisma.client.library.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.library.deleteMany({
      where: { id: { in: ids } },
    });
    return libraries;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Library[]> {
    if (ids.length === 0) {
      return [];
    }
    const libraries = await this.prisma.client.library.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.library.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return libraries;
  }
}
