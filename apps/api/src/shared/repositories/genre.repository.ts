import { Injectable } from '@nestjs/common';
import {
  Genre,
  GenreCreateInput,
  GenreCreateManyInput,
  GenreGetPayload,
  GenreInclude,
  GenreOrderByWithRelationInput,
  GenreUpdateInput,
  GenreWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single genre by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @returns The found genre or null if not found.
   */
  async findOne(
    where: GenreWhereInput,
  ): Promise<GenreGetPayload<{ include: { library: true } }> | null> {
    return this.prisma.client.genre.findFirst({
      where: { ...where, deletedAt: null },
      include: { library: true },
    });
  }

  /**
   * Finds a single genre by the given where conditions with relations.
   * @param where - The where conditions to filter the genres by.
   * @param include - The relations to include in the result.
   * @returns The found genre with relations or null if not found.
   */
  async findOneWithInclude<I extends GenreInclude>(
    where: GenreWhereInput,
    include: I,
  ): Promise<GenreGetPayload<{ include: I }> | null> {
    return this.prisma.client.genre.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of genres to return. Defaults to 10.
   *   - `skip` (number, optional): The number of genres to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (GenreOrderByWithRelationInput or array of it, optional): The order in which to sort the genres. Defaults to descending by `createdAt`.
   * @returns The found genres.
   */
  async findMany(
    where: GenreWhereInput,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: GenreOrderByWithRelationInput | GenreOrderByWithRelationInput[];
    },
  ): Promise<GenreGetPayload<{ include: { library: true } }>[]> {
    return this.prisma.client.genre.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: { library: true },
    });
  }

  /**
   * Finds multiple genres by the given where conditions with relations.
   * @param where - The where conditions to filter the genres by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of genres to return. Defaults to 10.
   *   - `skip` (number, optional): The number of genres to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (GenreOrderByWithRelationInput or array of it, optional): The order in which to sort the genres. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found genres with relations.
   */
  async findManyWithInclude<I extends GenreInclude>(
    where: GenreWhereInput,
    include: I,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: GenreOrderByWithRelationInput | GenreOrderByWithRelationInput[];
    },
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    return this.prisma.client.genre.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a genre exists by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @returns True if the genre exists, false otherwise.
   */
  async exists(where: GenreWhereInput): Promise<boolean> {
    const count = await this.prisma.client.genre.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @returns The number of genres.
   */
  async count(where?: GenreWhereInput): Promise<number> {
    return this.prisma.client.genre.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Creates a new genre.
   * @param data - The data for the genre.
   * @returns The created genre.
   */
  async create(data: GenreCreateInput): Promise<Genre> {
    return this.prisma.client.genre.create({
      data,
    });
  }

  /**
   * Creates multiple new genres.
   * @param data - The data for the genres.
   * @returns The created genres.
   */
  async createMany(data: GenreCreateManyInput[]): Promise<Genre[]> {
    return this.prisma.client.genre.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a genre by the given ID.
   * @param id - The ID of the genre to update.
   * @param data - The data to update the genre with.
   * @returns The updated genre.
   */
  async update(id: string, data: GenreUpdateInput): Promise<Genre> {
    return this.prisma.client.genre.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * WARNING: This method marks the genres as deleted by setting the `deletedAt` field to the current date/time.
   * Updates multiple genres by the given IDs.
   * @param updates - The updates to apply to the genres.
   * @returns The updated genres.
   */
  async updateMany(updates: { id: string; data: GenreUpdateInput }[]): Promise<Genre[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.genre.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * WARNING: This method marks the genre as deleted by setting the `deletedAt` field to the current date/time.
   * It performs a soft delete rather than a hard delete to maintain referential integrity with related records.
   * Deletes a genre by the given ID.
   * @param id - The ID of the genre to delete.
   * @returns The deleted genre.
   */
  async delete(id: string): Promise<Genre> {
    return this.softDelete(id);
  }

  /**
   * Soft deletes multiple genres by the given filter conditions.
   * Note: This sets the `deletedAt` field to the current date/time to maintain referential integrity.
   * @param filter - The filter conditions to select genres to soft delete.
   * @returns The soft-deleted genres.
   */
  async deleteMany(filter: GenreWhereInput): Promise<Genre[]> {
    return this.softDeleteMany(filter);
  }

  /**
   * Soft deletes a genre by the given ID.
   * Soft deletion is used here to maintain referential integrity with related records.
   * @param id - The ID of the genre to soft delete.
   * @returns The deleted genre.
   */
  async softDelete(id: string): Promise<Genre> {
    return this.prisma.client.genre.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple genres by the given where conditions.
   * Soft deletion is used here to maintain referential integrity with related records.
   * @param where - The where conditions to filter the genres by.
   * @returns The deleted genres.
   */
  async softDeleteMany(where: GenreWhereInput): Promise<Genre[]> {
    return this.prisma.client.genre.updateManyAndReturn({
      where: { ...where, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restores a soft deleted genre by the given ID.
   * @param id - The ID of the genre to restore.
   * @returns The restored genre.
   */
  async restore(id: string): Promise<Genre> {
    return this.prisma.client.genre.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @returns The restored genres.
   */
  async restoreMany(where: GenreWhereInput): Promise<Genre[]> {
    return this.prisma.client.genre.updateManyAndReturn({
      where: { ...where, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }
}
