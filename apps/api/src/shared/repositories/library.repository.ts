import { Injectable } from '@nestjs/common';
import {
  LibraryCreateManyInput,
  LibraryCreateInput,
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

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single library by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @param include - The relations to include in the result.
   * @returns The found library or null if not found.
   */
  async findOne<I extends LibraryInclude>(
    where: LibraryWhereInput,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }> | null> {
    return await this.prisma.client.library.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { user: true },
    });
  }

  /**
   * Finds multiple libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of libraries to return. Defaults to 10.
   *   - `skip` (number, optional): The number of libraries to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryOrderByWithRelationInput, optional): The order in which to sort the libraries. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found libraries.
   */
  async findMany<I extends LibraryInclude>(
    where: LibraryWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    return await this.prisma.client.library.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.library.count({ where: { ...where, deletedAt: null } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new library.
   * @param data - The data for the library.
   * @param include - The relations to include in the result.
   * @returns The created library.
   */
  async create<I extends LibraryInclude>(
    data: LibraryCreateInput,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>> {
    return await this.prisma.client.library.create({ data, include: include ?? { user: true } });
  }

  /**
   * Creates multiple new libraries.
   * @param data - The data for the libraries.
   * @param include - The relations to include in the result.
   * @returns The created libraries.
   */
  async createMany<I extends LibraryInclude>(
    data: LibraryCreateManyInput[],
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    return await this.prisma.client.library.createManyAndReturn({
      data,
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a library by the given ID.
   * @param id - The ID of the library to update.
   * @param data - The data to update the library with.
   * @param include - The relations to include in the result.
   * @returns The updated library.
   */
  async update<I extends LibraryInclude>(
    id: string,
    data: LibraryUpdateInput,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>> {
    return await this.prisma.client.library.update({
      where: { id },
      data,
      include: include ?? { user: true },
    });
  }

  /**
   * Updates multiple libraries by the given IDs.
   * @param updates - The updates to apply to the libraries.
   * @param include - The relations to include in the result.
   * @returns The updated libraries.
   */
  async updateMany<I extends LibraryInclude>(
    updates: { id: string; data: LibraryUpdateInput }[],
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.library.update({
          where: { id },
          data,
          include: include ?? { user: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes a library by the given ID.
   * @param id - The ID of the library to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library.
   */
  async delete<I extends LibraryInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>> {
    return await this.prisma.client.library.delete({
      where: { id },
      include: include ?? { user: true },
    });
  }

  /**
   * Deletes multiple libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @param include - The relations to include in the result.
   * @returns The deleted libraries.
   */
  async deleteMany<I extends LibraryInclude>(
    where: LibraryWhereInput,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    const librariesToDelete = await this.prisma.client.library.findMany({
      where,
      include: include ?? { user: true },
    });
    if (librariesToDelete.length === 0) return [];

    await this.prisma.client.library.deleteMany({
      where: { id: { in: librariesToDelete.map((library) => library.id) } },
    });

    return librariesToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a library by the given ID.
   * @param id - The ID of the library to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library.
   */
  async softDelete<I extends LibraryInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>> {
    return await this.prisma.client.library.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { user: true },
    });
  }

  /**
   * Soft deletes multiple libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @param include - The relations to include in the result.
   * @returns The deleted libraries.
   */
  async softDeleteMany<I extends LibraryInclude>(
    where: LibraryWhereInput,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    const librariesToDelete = await this.prisma.client.library.findMany({
      where,
      include: include ?? { user: true },
    });
    if (librariesToDelete.length === 0) return [];

    const libraryIds = librariesToDelete.map((library) => library.id);
    await this.prisma.client.library.updateMany({
      where: { id: { in: libraryIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.library.findMany({
      where: { id: { in: libraryIds } },
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted library by the given ID.
   * @param id - The ID of the library to restore.
   * @param include - The relations to include in the result.
   * @returns The restored library.
   */
  async restore<I extends LibraryInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>> {
    return await this.prisma.client.library.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { user: true },
    });
  }

  /**
   * Restores multiple soft deleted libraries by the given where conditions.
   * @param where - The where conditions to filter the libraries by.
   * @param include - The relations to include in the result.
   * @returns The restored libraries.
   */
  async restoreMany<I extends LibraryInclude>(
    where: LibraryWhereInput,
    include?: I,
  ): Promise<LibraryGetPayload<{ include: I }>[]> {
    const librariesToRestore = await this.prisma.client.library.findMany({
      where,
      include: include ?? { user: true },
    });
    if (librariesToRestore.length === 0) return [];

    const libraryIds = librariesToRestore.map((library) => library.id);
    await this.prisma.client.library.updateMany({
      where: { id: { in: libraryIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.library.findMany({
      where: { id: { in: libraryIds } },
      include: include ?? { user: true },
    });
  }
}
