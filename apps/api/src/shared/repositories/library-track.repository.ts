import { Injectable } from '@nestjs/common';
import {
  LibraryTrackCreateInput,
  LibraryTrackOrderByWithRelationInput,
  LibraryTrackUpdateInput,
  LibraryTrackWhereInput,
  LibraryTrackGetPayload,
  LibraryTrackInclude,
  LibraryTrackCreateManyInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single library track by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @param include - The relations to include in the result.
   * @returns The found library track or null if not found.
   */
  async findOne<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }> | null> {
    return await this.prisma.client.libraryTrack.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? {
        track: { include: { artists: true, album: true, genres: { include: { genre: true } } } },
      },
    });
  }

  /**
   * Finds multiple library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @param options - The options for the query.
   * @param include - The relations to include in the result.
   * @returns The found library tracks.
   */
  async findMany<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
    },
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    return await this.prisma.client.libraryTrack.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? {
        track: { include: { artists: true, album: true, genres: { include: { genre: true } } } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  /**
   * Checks if a library track exists by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns True if the library track exists, false otherwise.
   */
  async exists(where: LibraryTrackWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryTrack.count({ where });
    return count > 0;
  }

  /**
   * Counts the number of library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns The number of library tracks.
   */
  async count(where?: LibraryTrackWhereInput): Promise<number> {
    return await this.prisma.client.libraryTrack.count({
      where: { ...where, deletedAt: null },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new library track.
   * @param data - The data for the library track.
   * @param include - The relations to include in the result.
   * @returns The created library track.
   */
  async create<I extends LibraryTrackInclude>(
    data: LibraryTrackCreateInput,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryTrack.create({ data, include: include ?? undefined });
  }

  /**
   * Creates multiple new library tracks.
   * @param data - The data for the library tracks.
   * @param include - The relations to include in the result.
   * @returns The created library tracks.
   */
  async createMany<I extends LibraryTrackInclude>(
    data: LibraryTrackCreateManyInput[],
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    return await this.prisma.client.libraryTrack.createManyAndReturn({
      data,
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a library track by the given ID.
   * @param id - The ID of the library track to update.
   * @param data - The data to update the library track with.
   * @param include - The relations to include in the result.
   * @returns The updated library track.
   */
  async update<I extends LibraryTrackInclude>(
    id: string,
    data: LibraryTrackUpdateInput,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryTrack.update({
      data,
      where: { id },
      include: include ?? undefined,
    });
  }

  /**
   * Updates multiple library tracks by the given IDs.
   * @param updates - The updates to apply to the library tracks.
   * @param include - The relations to include in the result.
   * @returns The updated library tracks.
   */
  async updateMany<I extends LibraryTrackInclude>(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryTrack.update({
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
   * Deletes a library track by the given ID.
   * @param id - The ID of the library track to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library track.
   */
  async delete<I extends LibraryTrackInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryTrack.delete({
      where: { id },
      include: include ?? undefined,
    });
  }

  /**
   * Deletes multiple library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @param include - The relations to include in the result.
   * @returns The deleted library tracks.
   */
  async deleteMany<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    const libraryTracksToDelete = await this.prisma.client.libraryTrack.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryTracksToDelete.length === 0) return [];

    await this.prisma.client.libraryTrack.deleteMany({
      where: { id: { in: libraryTracksToDelete.map((libraryTrack) => libraryTrack.id) } },
    });

    return libraryTracksToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a library track by the given ID.
   * @param id - The ID of the library track to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted library track.
   */
  async softDelete<I extends LibraryTrackInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryTrack.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? undefined,
    });
  }

  /**
   * Soft deletes multiple library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @param include - The relations to include in the result.
   * @returns The deleted library tracks.
   */
  async softDeleteMany<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    const libraryTracksToDelete = await this.prisma.client.libraryTrack.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryTracksToDelete.length === 0) return [];

    const libraryTrackIds = libraryTracksToDelete.map((libraryTrack) => libraryTrack.id);
    await this.prisma.client.libraryTrack.updateMany({
      where: { id: { in: libraryTrackIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.libraryTrack.findMany({
      where: { id: { in: libraryTrackIds } },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted library track by the given ID.
   * @param id - The ID of the library track to restore.
   * @param include - The relations to include in the result.
   * @returns The restored library track.
   */
  async restore<I extends LibraryTrackInclude>(
    id: string,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>> {
    return await this.prisma.client.libraryTrack.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Restores multiple soft deleted library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @param include - The relations to include in the result.
   * @returns The restored library tracks.
   */
  async restoreMany<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    include?: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    const libraryTracksToRestore = await this.prisma.client.libraryTrack.findMany({
      where,
      include: include ?? undefined,
    });
    if (libraryTracksToRestore.length === 0) return [];

    const libraryTrackIds = libraryTracksToRestore.map((libraryTrack) => libraryTrack.id);
    await this.prisma.client.libraryTrack.updateMany({
      where: { id: { in: libraryTrackIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.libraryTrack.findMany({
      where: { id: { in: libraryTrackIds } },
      include: include ?? undefined,
    });
  }
}
