import { Injectable } from '@nestjs/common';
import {
  LibraryArtistCreateInput,
  LibraryArtistOrderByWithRelationInput,
  LibraryArtistUpdateInput,
  LibraryArtistWhereInput,
  LibraryArtistGetPayload,
  LibraryArtistInclude,
  LibraryArtistCreateManyInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single library artist by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @param include - The relations to include in the result.
   * @returns The found library artist or null if not found.
   */
  async findOne<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }> | null> {
    return await this.prisma.client.libraryArtist.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? {
        artist: { include: { avatar: true, banner: true, genres: { include: { genre: true } } } },
      },
    });
  }

  /**
   * Finds multiple library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @param options - The options for the query.
   * @param include - The relations to include in the result.
   * @returns The found library artists.
   */
  async findMany<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryArtistOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    return await this.prisma.client.libraryArtist.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? {
        artist: { include: { avatar: true, banner: true, genres: { include: { genre: true } } } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.libraryArtist.count({ where: { ...where, deletedAt: null } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new library artist.
   * @param data - The data for the library artist.
   * @param include - The relations to include in the result.
   * @returns The created library artist.
   */
  async create<I extends LibraryArtistInclude>(
    data: LibraryArtistCreateInput,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryArtist.create({ data, include: include ?? undefined });
  }

  /**
   * Creates multiple new library artists.
   * @param data - The data for the library artists.
   * @param include - The relations to include in the result.
   * @returns The created library artists.
   */
  async createMany<I extends LibraryArtistInclude>(
    data: LibraryArtistCreateManyInput[],
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    return await this.prisma.client.libraryArtist.createManyAndReturn({
      data,
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a library artist by the given ID.
   * @param id - The ID of the library artist to update.
   * @param data - The data to update the library artist with.
   * @param include - The relations to include in the result.
   * @returns The updated library artist.
   */
  async update<I extends LibraryArtistInclude>(
    id: string,
    data: LibraryArtistUpdateInput,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryArtist.update({
      data,
      where: { id },
      include: include ?? undefined,
    });
  }

  /**
   * Updates multiple library artists by the given IDs.
   * @param updates - The updates to apply to the library artists.
   * @param include - The relations to include in the result.
   * @returns The updated library artists.
   */
  async updateMany<I extends LibraryArtistInclude>(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryArtist.update({
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
   * Deletes a library artist by the given ID.
   * @param id - The ID of the library artist to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library artist.
   */
  async delete<I extends LibraryArtistInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryArtist.delete({
      where: { id },
      include: include ?? undefined,
    });
  }

  /**
   * Deletes multiple library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @param include - The relations to include in the result.
   * @returns The deleted library artists.
   */
  async deleteMany<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    const libraryArtistsToDelete = await this.prisma.client.libraryArtist.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryArtistsToDelete.length === 0) return [];

    await this.prisma.client.libraryArtist.deleteMany({
      where: { id: { in: libraryArtistsToDelete.map((libraryArtist) => libraryArtist.id) } },
    });

    return libraryArtistsToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a library artist by the given ID.
   * @param id - The ID of the library artist to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library artist.
   */
  async softDelete<I extends LibraryArtistInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryArtist.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? undefined,
    });
  }

  /**
   * Soft deletes multiple library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @param include - The relations to include in the result.
   * @returns The deleted library artists.
   */
  async softDeleteMany<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    const libraryArtistsToDelete = await this.prisma.client.libraryArtist.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryArtistsToDelete.length === 0) return [];

    const libraryArtistIds = libraryArtistsToDelete.map((libraryArtist) => libraryArtist.id);
    await this.prisma.client.libraryArtist.updateMany({
      where: { id: { in: libraryArtistIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.libraryArtist.findMany({
      where: { id: { in: libraryArtistIds } },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted library artist by the given ID.
   * @param id - The ID of the library artist to restore.
   * @param include - The relations to include in the result.
   * @returns The restored library artist.
   */
  async restore<I extends LibraryArtistInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryArtist.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Restores multiple soft deleted library artists by the given where conditions.
   * @param where - The where conditions to filter the library artists by.
   * @param include - The relations to include in the result.
   * @returns The restored library artists.
   */
  async restoreMany<I extends LibraryArtistInclude>(
    where: LibraryArtistWhereInput,
    include?: I,
  ): Promise<LibraryArtistGetPayload<{ include: I }>[]> {
    const libraryArtistsToRestore = await this.prisma.client.libraryArtist.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryArtistsToRestore.length === 0) return [];

    const libraryArtistIds = libraryArtistsToRestore.map((libraryArtist) => libraryArtist.id);
    await this.prisma.client.libraryArtist.updateMany({
      where: { id: { in: libraryArtistIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.libraryArtist.findMany({
      where: { id: { in: libraryArtistIds } },
      include: include ?? undefined,
    });
  }
}
