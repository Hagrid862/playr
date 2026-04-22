import { Injectable } from '@nestjs/common';
import {
  Library,
  LibraryCreateInput,
  LibraryCreateManyInput,
  LibraryGetPayload,
  LibraryInclude,
  LibraryOrderByWithRelationInput,
  LibraryUpdateInput,
  LibraryWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single library by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @returns The found library or null if not found.
   */
  async findOne(
    where: LibraryWhereInput,
  ): Promise<LibraryGetPayload<{ include: { user: true } }> | null> {
    return this.prisma.client.library.findFirst({
      where: { ...where, deletedAt: null },
      include: { user: true },
    });
  }

  /**
   * Finds a single library by the given where conditions with relations.
   * @param where - The where conditions to filter the libraries by.
   * @param include - The relations to include in the result.
   * @returns The found library with relations or null if not found.
   */
  async findOneWithInclude<I extends LibraryInclude>(
    where: LibraryWhereInput,
    include: I,
  ): Promise<LibraryGetPayload<{ include: I }> | null> {
    return this.prisma.client.library.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of libraries to return. Defaults to 10.
   *   - `skip` (number, optional): The number of libraries to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryOrderByWithRelationInput or array of it, optional): The order in which to sort the libraries. Defaults to descending by `createdAt`.
   * @returns The found libraries.
   */
  async findMany(
    where: LibraryWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryOrderByWithRelationInput | LibraryOrderByWithRelationInput[];
    },
  ): Promise<LibraryGetPayload<{ include: { user: true } }>[]> {
    return this.prisma.client.library.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { user: true },
    });
  }

  /**
   * Finds multiple libraries by the given where conditions with relations.
   * @param where - The where conditions to filter the libraries by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of libraries to return. Defaults to 10.
   *   - `skip` (number, optional): The number of libraries to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryOrderByWithRelationInput or array of it, optional): The order in which to sort the libraries. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found libraries with relations.
   */
  async findManyWithInclude<I extends LibraryInclude>(
    where: LibraryWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryOrderByWithRelationInput | LibraryOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    return this.prisma.client.library.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a library exists by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @returns True if the library exists, false otherwise.
   */
  async exists(where: LibraryWhereInput): Promise<boolean> {
    const count = await this.prisma.client.library.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @returns The number of libraries.
   */
  async count(where?: LibraryWhereInput): Promise<number> {
    return this.prisma.client.library.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Creates a new library.
   * @param data - The data for the library.
   * @returns The created library.
   */
  async create(data: LibraryCreateInput): Promise<Library> {
    return this.prisma.client.library.create({
      data,
    });
  }

  /**
   * Creates multiple new libraries.
   * @param data - The data for the libraries.
   * @returns The created libraries.
   */
  async createMany(data: LibraryCreateManyInput[]): Promise<Library[]> {
    return this.prisma.client.library.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a library by the given ID.
   * @param id - The ID of the library to update.
   * @param data - The data to update the library with.
   * @returns The updated library.
   */
  async update(id: string, data: LibraryUpdateInput): Promise<Library> {
    return this.prisma.client.library.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple libraries by the given IDs.
   * @param updates - The updates to apply to the libraries.
   * @returns The updated libraries.
   */
  async updateMany(updates: { id: string; data: LibraryUpdateInput }[]): Promise<Library[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.library.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes a library by the given ID.
   * @param id - The ID of the library to delete.
   * @returns The deleted library.
   */
  async delete(id: string): Promise<Library> {
    return this.prisma.client.library.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple libraries by the given where conditions.
   * @param filter - The where conditions to filter the libraries by.
   * @returns The deleted libraries.
   */
  async deleteMany(filter: LibraryWhereInput): Promise<Library[]> {
    const toDelete = await this.prisma.client.library.findMany({
      where: filter,
    });

    if (toDelete.length === 0) return [];

    await this.prisma.client.library.deleteMany({
      where: { id: { in: toDelete.map((a) => a.id) } },
    });

    return toDelete;
  }

  /**
   * Soft deletes a library by the given ID.
   * @param id - The ID of the library to soft delete.
   * @returns The deleted library.
   */
  async softDelete(id: string): Promise<Library> {
    return this.prisma.client.library.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @returns The deleted libraries.
   */
  async softDeleteMany(where: LibraryWhereInput): Promise<Library[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const rows = await tx.library.findMany({
        where: { ...where, deletedAt: null },
      });
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.library.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt },
      });

      return tx.library.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Restores a soft deleted library by the given ID.
   * @param id - The ID of the library to restore.
   * @returns The restored library.
   */
  async restore(id: string): Promise<Library> {
    return this.prisma.client.library.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @returns The restored libraries.
   */
  async restoreMany(where: LibraryWhereInput): Promise<Library[]> {
    const toRestore = await this.prisma.client.library.findMany({
      where: { ...where, deletedAt: { not: null } },
    });
    if (toRestore.length === 0) return [];

    const ids = toRestore.map((row) => row.id);
    await this.prisma.client.library.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });

    return this.prisma.client.library.findMany({
      where: { id: { in: ids } },
    });
  }
}
