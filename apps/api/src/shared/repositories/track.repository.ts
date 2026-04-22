import { Injectable } from '@nestjs/common';
import {
  Track,
  TrackCreateInput,
  TrackCreateManyInput,
  TrackGetPayload,
  TrackInclude,
  TrackOrderByWithRelationInput,
  TrackUpdateInput,
  TrackWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class TrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single track by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @returns The found track or null if not found.
   */
  async findOne(
    where: TrackWhereInput,
  ): Promise<TrackGetPayload<{ include: { access: true } }> | null> {
    return this.prisma.client.track.findFirst({
      where: { ...where, deletedAt: null },
      include: {
        access: true,
      },
    });
  }

  /**
   * Finds a single track by the given where conditions with custom relations.
   * @param where - The where conditions to filter the tracks by.
   * @param include - The relations to include in the result.
   * @returns The found track with relations or null if not found.
   */
  async findOneWithInclude<I extends TrackInclude>(
    where: TrackWhereInput,
    include: I,
  ): Promise<TrackGetPayload<{ include: I }> | null> {
    return this.prisma.client.track.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of tracks to return. Defaults to 10.
   *   - `skip` (number, optional): The number of tracks to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (TrackOrderByWithRelationInput or array of it, optional): The order in which to sort the tracks. Defaults to descending by `createdAt`.
   * @returns The found tracks.
   */
  async findMany(
    where: TrackWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput | TrackOrderByWithRelationInput[];
    },
  ): Promise<TrackGetPayload<{ include: { access: true } }>[]> {
    return this.prisma.client.track.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { access: true },
    });
  }

  /**
   * Finds multiple tracks by the given where conditions with custom relations.
   * @param where - The where conditions to filter the tracks by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of tracks to return. Defaults to 10.
   *   - `skip` (number, optional): The number of tracks to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (TrackOrderByWithRelationInput or array of it, optional): The order in which to sort the tracks. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found tracks with relations.
   */
  async findManyWithInclude<I extends TrackInclude>(
    where: TrackWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput | TrackOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    return this.prisma.client.track.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a track exists by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @returns True if the track exists, false otherwise.
   */
  async exists(where: TrackWhereInput): Promise<boolean> {
    const count = await this.prisma.client.track.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @returns The number of tracks.
   */
  async count(where?: TrackWhereInput): Promise<number> {
    return this.prisma.client.track.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to a track (public, direct track access, album access, or artist access).
   * Guest access uses user id `GUEST` when `userId` is omitted.
   * @param where - The where conditions to filter the tracks by.
   * @param userId - The ID of the user to check (optional; defaults to guest).
   * @returns True if the user has access, false otherwise.
   */
  async checkAccess(where: TrackWhereInput, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const track = await this.prisma.client.track.findFirst({
      where: {
        ...where,
        deletedAt: null,
        OR: [
          { visibility: 'public' },
          {
            access: {
              some: { userId: activeUserId },
            },
          },
          {
            album: {
              access: {
                some: { userId: activeUserId },
              },
            },
          },
          {
            artists: {
              some: {
                access: {
                  some: { userId: activeUserId },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return !!track;
  }

  /**
   * Creates a new track.
   * @param data - The data for the track.
   * @returns The created track.
   */
  async create(data: TrackCreateInput): Promise<Track> {
    return this.prisma.client.track.create({
      data,
    });
  }

  /**
   * Creates multiple new tracks.
   * @param data - The data for the tracks.
   * @returns The created tracks.
   */
  async createMany(data: TrackCreateManyInput[]): Promise<Track[]> {
    return this.prisma.client.track.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a track by the given ID.
   * @param id - The ID of the track to update.
   * @param data - The data to update the track with.
   * @returns The updated track.
   */
  async update(id: string, data: TrackUpdateInput): Promise<Track> {
    return this.prisma.client.track.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple tracks by the given IDs.
   * @param updates - The updates to apply to the tracks.
   * @returns The updated tracks.
   */
  async updateMany(updates: { id: string; data: TrackUpdateInput }[]): Promise<Track[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.track.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes a track by the given ID.
   * @param id - The ID of the track to delete.
   * @returns The deleted track.
   */
  async delete(id: string): Promise<Track> {
    return this.prisma.client.track.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple tracks by the given where conditions.
   * @param filter - The where conditions to filter the tracks by.
   * @returns The deleted tracks.
   */
  async deleteMany(filter: TrackWhereInput): Promise<Track[]> {
    const toDelete = await this.prisma.client.track.findMany({
      where: filter,
    });

    if (toDelete.length === 0) return [];

    await this.prisma.client.track.deleteMany({
      where: { id: { in: toDelete.map((row) => row.id) } },
    });

    return toDelete;
  }

  /**
   * Soft deletes a track by the given ID.
   * @param id - The ID of the track to soft delete.
   * @param cascade - Option to delete related library links
   * @returns The deleted track.
   */
  async softDelete(id: string, cascade: boolean = false): Promise<Track> {
    if (!cascade) {
      return this.prisma.client.track.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    const deletedAt = new Date();

    return this.prisma.mainClient.$transaction(async (tx) => {
      await tx.libraryTrack.updateMany({
        where: { trackId: id, deletedAt: null },
        data: { deletedAt },
      });

      return tx.track.update({
        where: { id, deletedAt: null },
        data: { deletedAt },
      });
    });
  }

  /**
   * Soft deletes multiple tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @returns The deleted tracks.
   */
  async softDeleteMany(where: TrackWhereInput): Promise<Track[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const rows = await tx.track.findMany({
        where: { ...where, deletedAt: null },
      });
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.track.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt },
      });

      return tx.track.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Restores a soft deleted track by the given ID.
   * @param id - The ID of the track to restore.
   * @returns The restored track.
   */
  async restore(id: string): Promise<Track> {
    return this.prisma.client.track.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @returns The restored tracks.
   */
  async restoreMany(where: TrackWhereInput): Promise<Track[]> {
    const toRestore = await this.prisma.client.track.findMany({
      where: { ...where, deletedAt: { not: null } },
    });
    if (toRestore.length === 0) return [];

    const ids = toRestore.map((row) => row.id);
    await this.prisma.client.track.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });

    return this.prisma.client.track.findMany({
      where: { id: { in: ids } },
    });
  }
}
