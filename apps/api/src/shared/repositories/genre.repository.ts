import { Injectable } from '@nestjs/common';
import {
  GenreGetPayload,
  GenreInclude,
  GenreCreateInput,
  GenreCreateManyInput,
  GenreOrderByWithRelationInput,
  GenreUpdateInput,
  GenreWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single genre by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @param include - The relations to include in the result.
   * @returns The found genre or null if not found.
   */
  async findOne<I extends GenreInclude>(
    where: GenreWhereInput,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Finds multiple genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of genres to return. Defaults to 10.
   *   - `skip` (number, optional): The number of genres to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (GenreOrderByWithRelationInput, optional): The order in which to sort the genres. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found genres.
   */
  async findMany<I extends GenreInclude>(
    where: GenreWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: GenreOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    return await this.prisma.client.genre.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.genre.count({ where: { ...where, deletedAt: null } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new genre.
   * @param data - The data for the genre.
   * @param include - The relations to include in the result.
   * @returns The created genre.
   */
  async create<I extends GenreInclude>(
    data: GenreCreateInput,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>> {
    return await this.prisma.client.genre.create({ data, include: include ?? undefined });
  }

  /**
   * Creates multiple new genres.
   * @param data - The data for the genres.
   * @param include - The relations to include in the result.
   * @returns The created genres.
   */
  async createMany<I extends GenreInclude>(
    data: GenreCreateManyInput[],
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    return await this.prisma.client.genre.createManyAndReturn({
      data,
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a genre by the given ID.
   * @param id - The ID of the genre to update.
   * @param data - The data to update the genre with.
   * @param include - The relations to include in the result.
   * @returns The updated genre.
   */
  async update<I extends GenreInclude>(
    id: string,
    data: GenreUpdateInput,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>> {
    return await this.prisma.client.genre.update({
      where: { id },
      data,
      include: include ?? undefined,
    });
  }

  /**
   * Updates multiple genres by the given IDs.
   * @param updates - The updates to apply to the genres.
   * @param include - The relations to include in the result.
   * @returns The updated genres.
   */
  async updateMany<I extends GenreInclude>(
    updates: { id: string; data: GenreUpdateInput }[],
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.genre.update({
          where: { id },
          data,
          include: include ?? undefined,
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes a genre by the given ID.
   * @param id - The ID of the genre to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted genre.
   */
  async delete<I extends GenreInclude>(
    id: string,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>> {
    return await this.prisma.client.genre.delete({
      where: { id },
      include: include ?? undefined,
    });
  }

  /**
   * Deletes multiple genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @param include - The relations to include in the result.
   * @returns The deleted genres.
   */
  async deleteMany<I extends GenreInclude>(
    where: GenreWhereInput,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    const genresToDelete = await this.prisma.client.genre.findMany({
      where,
      include: include ?? undefined,
    });
    if (genresToDelete.length === 0) return [];

    await this.prisma.client.genre.deleteMany({
      where: { id: { in: genresToDelete.map((genre) => genre.id) } },
    });

    return genresToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a genre by the given ID.
   * @param id - The ID of the genre to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted genre.
   */
  async softDelete<I extends GenreInclude>(
    id: string,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>> {
    return await this.prisma.client.genre.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? undefined,
    });
  }

  /**
   * Soft deletes multiple genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @param include - The relations to include in the result.
   * @returns The deleted genres.
   */
  async softDeleteMany<I extends GenreInclude>(
    where: GenreWhereInput,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    const genresToDelete = await this.prisma.client.genre.findMany({
      where,
      include: include ?? undefined,
    });
    if (genresToDelete.length === 0) return [];

    const genreIds = genresToDelete.map((genre) => genre.id);
    await this.prisma.client.genre.updateMany({
      where: { id: { in: genreIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.genre.findMany({
      where: { id: { in: genreIds } },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted genre by the given ID.
   * @param id - The ID of the genre to restore.
   * @param include - The relations to include in the result.
   * @returns The restored genre.
   */
  async restore<I extends GenreInclude>(
    id: string,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>> {
    return await this.prisma.client.genre.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Restores multiple soft deleted genres by the given where conditions.
   * @param where - The where conditions to filter the genres by.
   * @param include - The relations to include in the result.
   * @returns The restored genres.
   */
  async restoreMany<I extends GenreInclude>(
    where: GenreWhereInput,
    include?: I,
  ): Promise<GenreGetPayload<{ include: I }>[]> {
    const genresToRestore = await this.prisma.client.genre.findMany({
      where,
      include: include ?? undefined,
    });
    if (genresToRestore.length === 0) return [];

    const genreIds = genresToRestore.map((genre) => genre.id);
    await this.prisma.client.genre.updateMany({
      where: { id: { in: genreIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.genre.findMany({
      where: { id: { in: genreIds } },
      include: include ?? undefined,
    });
  }
}
