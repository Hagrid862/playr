import { Injectable } from '@nestjs/common';
import {
  LibraryAlbumCreateInput,
  LibraryAlbumOrderByWithRelationInput,
  LibraryAlbumUpdateInput,
  LibraryAlbumWhereInput,
  LibraryAlbumGetPayload,
  LibraryAlbumInclude,
  LibraryAlbumCreateManyInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryAlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single library album by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @param include - The relations to include in the result.
   * @returns The found library album or null if not found.
   */
  async findOne<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }> | null> {
    return await this.prisma.client.libraryAlbum.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { album: { include: { cover: true, artists: true } } },
    });
  }

  /**
   * Finds multiple library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @param options - The options for the query.
   * @param include - The relations to include in the result.
   * @returns The found library albums.
   */
  async findMany<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryAlbumOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    return await this.prisma.client.libraryAlbum.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { album: { include: { cover: true, artists: true } } },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.libraryAlbum.count({
      where: { ...where, deletedAt: null },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new library album.
   * @param data - The data for the library album.
   * @param include - The relations to include in the result.
   * @returns The created library album.
   */
  async create<I extends LibraryAlbumInclude>(
    data: LibraryAlbumCreateInput,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryAlbum.create({ data, include: include ?? undefined });
  }

  /**
   * Creates multiple new library albums.
   * @param data - The data for the library albums.
   * @param include - The relations to include in the result.
   * @returns The created library albums.
   */
  async createMany<I extends LibraryAlbumInclude>(
    data: LibraryAlbumCreateManyInput[],
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    return await this.prisma.client.libraryAlbum.createManyAndReturn({
      data,
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a library album by the given ID.
   * @param id - The ID of the library album to update.
   * @param data - The data to update the library album with.
   * @param include - The relations to include in the result.
   * @returns The updated library album.
   */
  async update<I extends LibraryAlbumInclude>(
    id: string,
    data: LibraryAlbumUpdateInput,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryAlbum.update({
      where: { id },
      data,
      include: include ?? undefined,
    });
  }

  /**
   * Updates multiple library albums by the given IDs.
   * @param updates - The updates to apply to the library albums.
   * @param include - The relations to include in the result.
   * @returns The updated library albums.
   */
  async updateMany<I extends LibraryAlbumInclude>(
    updates: { id: string; data: LibraryAlbumUpdateInput }[],
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryAlbum.update({
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
   * Deletes a library album by the given ID.
   * @param id - The ID of the library album to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library album.
   */
  async delete<I extends LibraryAlbumInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryAlbum.delete({
      where: { id },
      include: include ?? undefined,
    });
  }

  /**
   * Deletes multiple library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @param include - The relations to include in the result.
   * @returns The deleted library albums.
   */
  async deleteMany<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    const libraryAlbumsToDelete = await this.prisma.client.libraryAlbum.findMany({
      where: { ...where, deletedAt: null },
      include: include ?? undefined,
    });
    if (libraryAlbumsToDelete.length === 0) return [];

    await this.prisma.client.libraryAlbum.deleteMany({
      where: { id: { in: libraryAlbumsToDelete.map((libraryAlbum) => libraryAlbum.id) } },
    });

    return libraryAlbumsToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a library album by the given ID.
   * @param id - The ID of the library album to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library album.
   */
  async softDelete<I extends LibraryAlbumInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryAlbum.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? undefined,
    });
  }

  /**
   * Soft deletes multiple library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @param include - The relations to include in the result.
   * @returns The deleted library albums.
   */
  async softDeleteMany<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    const libraryAlbumsToDelete = await this.prisma.client.libraryAlbum.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryAlbumsToDelete.length === 0) return [];

    const libraryAlbumIds = libraryAlbumsToDelete.map((libraryAlbum) => libraryAlbum.id);
    await this.prisma.client.libraryAlbum.updateMany({
      where: { id: { in: libraryAlbumIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.libraryAlbum.findMany({
      where: { id: { in: libraryAlbumIds } },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted library album by the given ID.
   * @param id - The ID of the library album to restore.
   * @param include - The relations to include in the result.
   * @returns The restored library album.
   */
  async restore<I extends LibraryAlbumInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryAlbum.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Restores multiple soft deleted library albums by the given where conditions.
   * @param where - The where conditions to filter the library albums by.
   * @param include - The relations to include in the result.
   * @returns The restored library albums.
   */
  async restoreMany<I extends LibraryAlbumInclude>(
    where: LibraryAlbumWhereInput,
    include?: I,
  ): Promise<LibraryAlbumGetPayload<{ include: I }>[]> {
    const libraryAlbumsToRestore = await this.prisma.client.libraryAlbum.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryAlbumsToRestore.length === 0) return [];

    const libraryAlbumIds = libraryAlbumsToRestore.map((libraryAlbum) => libraryAlbum.id);
    await this.prisma.client.libraryAlbum.updateMany({
      where: { id: { in: libraryAlbumIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.libraryAlbum.findMany({
      where: { id: { in: libraryAlbumIds } },
      include: include ?? undefined,
    });
  }
}
