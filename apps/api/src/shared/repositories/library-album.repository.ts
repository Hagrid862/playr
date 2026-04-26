import { Injectable } from '@nestjs/common';
import {
  LibraryAlbum,
  LibraryAlbumCreateInput,
  LibraryAlbumCreateManyInput,
  LibraryAlbumGetPayload,
  LibraryAlbumInclude,
  LibraryAlbumOrderByWithRelationInput,
  LibraryAlbumUpdateInput,
  LibraryAlbumWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

const defaultLibraryAlbumFindInclude = {
  album: { include: { cover: true, artists: true } },
} as const;

@Injectable()
export class LibraryAlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single library album by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @returns The found library album or null if not found.
   */
  async findOne(
    where: LibraryAlbumWhereInput,
  ): Promise<LibraryAlbumGetPayload<{ include: typeof defaultLibraryAlbumFindInclude }> | null> {
    return this.prisma.client.libraryAlbum.findFirst({
      where: { ...where, deletedAt: null },
      include: defaultLibraryAlbumFindInclude,
    });
  }

  /**
   * Finds a single library album by the given where conditions with relations.
   * @param where - The where conditions to filter the library albums by.
   * @param include - The relations to include in the result.
   * @returns The found library album with relations or null if not found.
   */
  async findOneWithInclude<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    include: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }> | null> {
    return this.prisma.client.libraryAlbum.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of library albums to return. Defaults to 10.
   *   - `skip` (number, optional): The number of library albums to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryAlbumOrderByWithRelationInput or array of it, optional): The order in which to sort the library albums. Defaults to descending by `createdAt`.
   * @returns The found library albums.
   */
  async findMany(
    where: LibraryAlbumWhereInput,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: LibraryAlbumOrderByWithRelationInput | LibraryAlbumOrderByWithRelationInput[];
    },
  ): Promise<LibraryAlbumGetPayload<{ include: typeof defaultLibraryAlbumFindInclude }>[]> {
    return this.prisma.client.libraryAlbum.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: defaultLibraryAlbumFindInclude,
    });
  }

  /**
   * Finds multiple library albums by the given where conditions with relations.
   * @param where - The where conditions to filter the library albums by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of library albums to return. Defaults to 10.
   *   - `skip` (number, optional): The number of library albums to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryAlbumOrderByWithRelationInput or array of it, optional): The order in which to sort the library albums. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found library albums with relations.
   */
  async findManyWithInclude<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    include: I,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: LibraryAlbumOrderByWithRelationInput | LibraryAlbumOrderByWithRelationInput[];
    },
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    return this.prisma.client.libraryAlbum.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a library album exists by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @returns True if the library album exists, false otherwise.
   */
  async exists(where: LibraryAlbumWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryAlbum.count({
      where: { ...where, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Counts the number of library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @returns The number of library albums.
   */
  async count(where?: LibraryAlbumWhereInput): Promise<number> {
    return this.prisma.client.libraryAlbum.count({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Creates a new library album.
   * @param data - The data for the library album.
   * @returns The created library album.
   */
  async create(data: LibraryAlbumCreateInput): Promise<LibraryAlbum> {
    return this.prisma.client.libraryAlbum.create({
      data,
    });
  }

  /**
   * Creates multiple new library albums.
   * @param data - The data for the library albums.
   * @returns The created library albums.
   */
  async createMany(data: LibraryAlbumCreateManyInput[]): Promise<LibraryAlbum[]> {
    return this.prisma.client.libraryAlbum.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a library album by the given ID.
   * @param id - The ID of the library album to update.
   * @param data - The data to update the library album with.
   * @returns The updated library album.
   */
  async update(id: string, data: LibraryAlbumUpdateInput): Promise<LibraryAlbum> {
    return this.prisma.client.libraryAlbum.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple library albums by the given IDs.
   * @param updates - The updates to apply to the library albums.
   * @returns The updated library albums.
   */
  async updateMany(
    updates: { id: string; data: LibraryAlbumUpdateInput }[],
  ): Promise<LibraryAlbum[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryAlbum.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the library album from the database without checking or respecting the deletedAt field.
   * Deletes a library album by the given ID.
   * @param id - The ID of the library album to delete.
   * @returns The deleted library album.
   */
  async delete(id: string): Promise<LibraryAlbum> {
    return this.prisma.client.libraryAlbum.delete({
      where: { id },
    });
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the library albums from the database.
   * By default, it only targets active rows (deletedAt: null) to prevent accidental double-deletion or purging already soft-deleted data.
   * Pass an explicit `deletedAt` filter if you intend to purge soft-deleted rows.
   *
   * @param filter - The where conditions to filter the library albums by.
   * @returns The deleted library albums.
   */
  async deleteMany(filter: LibraryAlbumWhereInput): Promise<LibraryAlbum[]> {
    const combinedWhere: LibraryAlbumWhereInput = {
      ...filter,
      deletedAt: filter.deletedAt ?? null,
    };
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.libraryAlbum.findMany({
        where: combinedWhere,
      });

      if (toDelete.length === 0) return [];

      await tx.libraryAlbum.deleteMany({
        where: { id: { in: toDelete.map((row) => row.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes a library album by the given ID.
   * @param id - The ID of the library album to soft delete.
   * @returns The deleted library album.
   */
  async softDelete(id: string): Promise<LibraryAlbum> {
    return this.prisma.client.libraryAlbum.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @returns The deleted library albums.
   */
  async softDeleteMany(where: LibraryAlbumWhereInput): Promise<LibraryAlbum[]> {
    const deletedAt = new Date();
    return this.prisma.mainClient.$transaction((tx) =>
      tx.libraryAlbum.updateManyAndReturn({
        where: { ...where, deletedAt: null },
        data: { deletedAt },
      }),
    );
  }

  /**
   * Restores a soft deleted library album by the given ID.
   * @param id - The ID of the library album to restore.
   * @returns The restored library album.
   */
  async restore(id: string): Promise<LibraryAlbum> {
    return this.prisma.client.libraryAlbum.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @returns The restored library albums.
   */
  async restoreMany(where: LibraryAlbumWhereInput): Promise<LibraryAlbum[]> {
    return this.prisma.mainClient.$transaction((tx) =>
      tx.libraryAlbum.updateManyAndReturn({
        where: { ...where, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
    );
  }
}
