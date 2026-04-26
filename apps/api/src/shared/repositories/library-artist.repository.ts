import { Injectable } from '@nestjs/common';
import {
  LibraryArtist,
  LibraryArtistCreateInput,
  LibraryArtistCreateManyInput,
  LibraryArtistGetPayload,
  LibraryArtistInclude,
  LibraryArtistOrderByWithRelationInput,
  LibraryArtistUpdateInput,
  LibraryArtistWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

const defaultLibraryArtistFindInclude = {
  artist: { include: { avatar: true, banner: true, genres: { include: { genre: true } } } },
} as const;

@Injectable()
export class LibraryArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single library artist by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @returns The found library artist or null if not found.
   */
  async findOne(
    where: LibraryArtistWhereInput,
  ): Promise<LibraryArtistGetPayload<{ include: typeof defaultLibraryArtistFindInclude }> | null> {
    return this.prisma.client.libraryArtist.findFirst({
      where: { ...where, deletedAt: null },
      include: defaultLibraryArtistFindInclude,
    });
  }

  /**
   * Finds a single library artist by the given where conditions with relations.
   * @param where - The where conditions to filter the library artists by.
   * @param include - The relations to include in the result.
   * @returns The found library artist with relations or null if not found.
   */
  async findOneWithInclude<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    include: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }> | null> {
    return this.prisma.client.libraryArtist.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of library artists to return. Defaults to 10.
   *   - `skip` (number, optional): The number of library artists to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryArtistOrderByWithRelationInput or array of it, optional): The order in which to sort the library artists. Defaults to descending by `createdAt`.
   * @returns The found library artists.
   */
  async findMany(
    where: LibraryArtistWhereInput,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: LibraryArtistOrderByWithRelationInput | LibraryArtistOrderByWithRelationInput[];
    },
  ): Promise<LibraryArtistGetPayload<{ include: typeof defaultLibraryArtistFindInclude }>[]> {
    return this.prisma.client.libraryArtist.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: defaultLibraryArtistFindInclude,
    });
  }

  /**
   * Finds multiple library artists by the given where conditions with relations.
   * @param where - The where conditions to filter the library artists by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of library artists to return. Defaults to 10.
   *   - `skip` (number, optional): The number of library artists to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryArtistOrderByWithRelationInput or array of it, optional): The order in which to sort the library artists. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found library artists with relations.
   */
  async findManyWithInclude<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    include: I,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: LibraryArtistOrderByWithRelationInput | LibraryArtistOrderByWithRelationInput[];
    },
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    return this.prisma.client.libraryArtist.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a library artist exists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @returns True if the library artist exists, false otherwise.
   */
  async exists(where: LibraryArtistWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({
      where: { ...where, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Counts the number of library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @returns The number of library artists.
   */
  async count(where?: LibraryArtistWhereInput): Promise<number> {
    return this.prisma.client.libraryArtist.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Creates a new library artist.
   * @param data - The data for the library artist.
   * @returns The created library artist.
   */
  async create(data: LibraryArtistCreateInput): Promise<LibraryArtist> {
    return this.prisma.client.libraryArtist.create({
      data,
    });
  }

  /**
   * Creates multiple new library artists.
   * @param data - The data for the library artists.
   * @returns The created library artists.
   */
  async createMany(data: LibraryArtistCreateManyInput[]): Promise<LibraryArtist[]> {
    return this.prisma.client.libraryArtist.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a library artist by the given ID.
   * @param id - The ID of the library artist to update.
   * @param data - The data to update the library artist with.
   * @returns The updated library artist.
   */
  async update(id: string, data: LibraryArtistUpdateInput): Promise<LibraryArtist> {
    return this.prisma.client.libraryArtist.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple library artists by the given IDs.
   * @param updates - The updates to apply to the library artists.
   * @returns The updated library artists.
   */
  async updateMany(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
  ): Promise<LibraryArtist[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryArtist.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the library artist from the database without checking or respecting the deletedAt field.
   * Deletes a library artist by the given ID.
   * @param id - The ID of the library artist to delete.
   * @returns The deleted library artist.
   */
  async delete(id: string): Promise<LibraryArtist> {
    return this.prisma.client.libraryArtist.delete({
      where: { id },
    });
  }

  /**
   * WARNING: This method performs a permanent (hard) delete. By default, it targets active (non-deleted) rows by applying `deletedAt: null` unless a different `deletedAt` predicate is provided in the filter.
   * Deletes multiple library artists by the given where conditions.
   * @param filter - The where conditions to filter the library artists by.
   * @returns The deleted library artists.
   */
  async deleteMany(filter: LibraryArtistWhereInput): Promise<LibraryArtist[]> {
    const combinedWhere: LibraryArtistWhereInput = {
      ...filter,
      deletedAt: filter.deletedAt ?? null,
    };
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.libraryArtist.findMany({
        where: combinedWhere,
      });

      if (toDelete.length === 0) return [];

      await tx.libraryArtist.deleteMany({
        where: { id: { in: toDelete.map((row) => row.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes a library artist by the given ID.
   * @param id - The ID of the library artist to soft delete.
   * @returns The deleted library artist.
   */
  async softDelete(id: string): Promise<LibraryArtist> {
    return this.prisma.client.libraryArtist.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @returns The deleted library artists.
   */
  async softDeleteMany(where: LibraryArtistWhereInput): Promise<LibraryArtist[]> {
    const deletedAt = new Date();
    return this.prisma.mainClient.$transaction((tx) =>
      tx.libraryArtist.updateManyAndReturn({
        where: { ...where, deletedAt: null },
        data: { deletedAt },
      }),
    );
  }

  /**
   * Restores a soft deleted library artist by the given ID.
   * @param id - The ID of the library artist to restore.
   * @returns The restored library artist.
   */
  async restore(id: string): Promise<LibraryArtist> {
    return this.prisma.client.libraryArtist.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @returns The restored library artists.
   */
  async restoreMany(where: LibraryArtistWhereInput): Promise<LibraryArtist[]> {
    return this.prisma.mainClient.$transaction((tx) =>
      tx.libraryArtist.updateManyAndReturn({
        where: { ...where, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
    );
  }
}
