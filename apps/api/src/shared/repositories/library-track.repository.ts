import { Injectable } from '@nestjs/common';
import {
  LibraryTrack,
  LibraryTrackCreateInput,
  LibraryTrackCreateManyInput,
  LibraryTrackGetPayload,
  LibraryTrackInclude,
  LibraryTrackOrderByWithRelationInput,
  LibraryTrackUpdateInput,
  LibraryTrackWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

const defaultLibraryTrackFindInclude = {
  track: { include: { artists: true, album: true, genres: { include: { genre: true } } } },
} as const;

@Injectable()
export class LibraryTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single library track by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns The found library track or null if not found.
   */
  async findOne(
    where: LibraryTrackWhereInput,
  ): Promise<LibraryTrackGetPayload<{ include: typeof defaultLibraryTrackFindInclude }> | null> {
    return this.prisma.client.libraryTrack.findFirst({
      where: { ...where, deletedAt: null },
      include: defaultLibraryTrackFindInclude,
    });
  }

  /**
   * Finds a single library track by the given where conditions with relations.
   * @param where - The where conditions to filter the library tracks by.
   * @param include - The relations to include in the result.
   * @returns The found library track with relations or null if not found.
   */
  async findOneWithInclude<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    include: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }> | null> {
    return this.prisma.client.libraryTrack.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of library tracks to return. Defaults to 10.
   *   - `skip` (number, optional): The number of library tracks to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryTrackOrderByWithRelationInput or array of it): Sort order. Defaults to descending by `createdAt`.
   * @returns The found library tracks.
   */
  async findMany(
    where: LibraryTrackWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
    },
  ): Promise<LibraryTrackGetPayload<{ include: typeof defaultLibraryTrackFindInclude }>[]> {
    return this.prisma.client.libraryTrack.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: defaultLibraryTrackFindInclude,
    });
  }

  /**
   * Finds multiple library tracks by the given where conditions with relations.
   * @param where - The where conditions to filter the library tracks by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of library tracks to return. Defaults to 10.
   *   - `skip` (number, optional): The number of library tracks to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (LibraryTrackOrderByWithRelationInput or array of it, optional): Sort order. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found library tracks with relations.
   */
  async findManyWithInclude<I extends LibraryTrackInclude>(
    where: LibraryTrackWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<LibraryTrackGetPayload<{ include: I }>[]> {
    return this.prisma.client.libraryTrack.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a library track exists by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns True if the library track exists, false otherwise.
   */
  async exists(where: LibraryTrackWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryTrack.count({
      where: { ...where, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Counts the number of library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns The number of library tracks.
   */
  async count(where?: LibraryTrackWhereInput): Promise<number> {
    return this.prisma.client.libraryTrack.count({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Creates a new library track.
   * @param data - The data for the library track.
   * @returns The created library track.
   */
  async create(data: LibraryTrackCreateInput): Promise<LibraryTrack> {
    return this.prisma.client.libraryTrack.create({
      data,
    });
  }

  /**
   * Creates multiple new library tracks.
   * @param data - The data for the library tracks.
   * @returns The created library tracks.
   */
  async createMany(data: LibraryTrackCreateManyInput[]): Promise<LibraryTrack[]> {
    return this.prisma.client.libraryTrack.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a library track by the given ID.
   * @param id - The ID of the library track to update.
   * @param data - The data to update the library track with.
   * @returns The updated library track.
   */
  async update(id: string, data: LibraryTrackUpdateInput): Promise<LibraryTrack> {
    return this.prisma.client.libraryTrack.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple library tracks by the given IDs.
   * @param updates - The updates to apply to the library tracks.
   * @returns The updated library tracks.
   */
  async updateMany(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
  ): Promise<LibraryTrack[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryTrack.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes a library track by the given ID.
   * @param id - The ID of the library track to delete.
   * @returns The deleted library track.
   */
  async delete(id: string): Promise<LibraryTrack> {
    return this.prisma.client.libraryTrack.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple library tracks by the given where conditions.
   * @param filter - The where conditions to filter the library tracks by.
   * @returns The deleted library tracks.
   */
  async deleteMany(filter: LibraryTrackWhereInput): Promise<LibraryTrack[]> {
    const combinedWhere: LibraryTrackWhereInput = {
      ...filter,
      deletedAt: filter.deletedAt ?? null,
    };
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.libraryTrack.findMany({
        where: combinedWhere,
      });

      if (toDelete.length === 0) return [];

      await tx.libraryTrack.deleteMany({
        where: { id: { in: toDelete.map((row) => row.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes a library track by the given ID.
   * @param id - The ID of the library track to soft delete.
   * @returns The deleted library track.
   */
  async softDelete(id: string): Promise<LibraryTrack> {
    return this.prisma.client.libraryTrack.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns The deleted library tracks.
   */
  async softDeleteMany(where: LibraryTrackWhereInput): Promise<LibraryTrack[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const rows = await tx.libraryTrack.findMany({
        where: { ...where, deletedAt: null },
      });
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.libraryTrack.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt },
      });

      return tx.libraryTrack.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Restores a soft deleted library track by the given ID.
   * @param id - The ID of the library track to restore.
   * @returns The restored library track.
   */
  async restore(id: string): Promise<LibraryTrack> {
    return this.prisma.client.libraryTrack.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted library tracks by the given where conditions.
   * @param where - The where conditions to filter the library tracks by.
   * @returns The restored library tracks.
   */
  async restoreMany(where: LibraryTrackWhereInput): Promise<LibraryTrack[]> {
    const toRestore = await this.prisma.client.libraryTrack.findMany({
      where: { ...where, deletedAt: { not: null } },
    });
    if (toRestore.length === 0) return [];

    const ids = toRestore.map((row) => row.id);
    await this.prisma.client.libraryTrack.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });

    return this.prisma.client.libraryTrack.findMany({
      where: { id: { in: ids } },
    });
  }
}
