import { Injectable } from '@nestjs/common';
import {
  TrackGetPayload,
  TrackInclude,
  TrackCreateInput,
  TrackCreateManyInput,
  TrackOrderByWithRelationInput,
  TrackUpdateInput,
  TrackWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class TrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single track by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param include - The relations to include in the result.
   * @returns The found track or null if not found.
   */
  async findOne<I extends TrackInclude>(
    where: TrackWhereInput,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }> | null> {
    return await this.prisma.client.track.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  /**
   * Finds multiple tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of tracks to return. Defaults to 10.
   *   - `skip` (number, optional): The number of tracks to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (TrackOrderByWithRelationInput, optional): The order in which to sort the tracks. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found tracks.
   */
  async findMany<I extends TrackInclude>(
    where: TrackWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    return await this.prisma.client.track.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.track.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to a track by the given conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param userId - The ID of the user to check.
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

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new track.
   * @param data - The data for the track.
   * @param include - The relations to include in the result.
   * @returns The created track.
   */
  async create<I extends TrackInclude>(
    data: TrackCreateInput,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>> {
    return await this.prisma.client.track.create({
      data,
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  /**
   * Creates multiple new tracks.
   * @param data - The data for the tracks.
   * @param include - The relations to include in the result.
   * @returns The created tracks.
   */
  async createMany<I extends TrackInclude>(
    data: TrackCreateManyInput[],
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    return await this.prisma.client.track.createManyAndReturn({
      data,
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a track by the given ID.
   * @param id - The ID of the track to update.
   * @param data - The data to update the track with.
   * @param include - The relations to include in the result.
   * @returns The updated track.
   */
  async update<I extends TrackInclude>(
    id: string,
    data: TrackUpdateInput,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>> {
    return await this.prisma.client.track.update({
      where: { id },
      data,
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  /**
   * Updates multiple tracks by the given IDs.
   * @param updates - The updates to apply to the tracks.
   * @param include - The relations to include in the result.
   * @returns The updated tracks.
   */
  async updateMany<I extends TrackInclude>(
    updates: { id: string; data: TrackUpdateInput }[],
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.track.update({
          where: { id },
          data,
          include: include ?? { artists: true, album: true, access: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes a track by the given ID.
   * @param id - The ID of the track to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted track.
   */
  async delete<I extends TrackInclude>(
    id: string,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>> {
    return await this.prisma.client.track.delete({
      where: { id },
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  /**
   * Deletes multiple tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param include - The relations to include in the result.
   * @returns The deleted tracks.
   */
  async deleteMany<I extends TrackInclude>(
    where: TrackWhereInput,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    const tracksToDelete = await this.prisma.client.track.findMany({
      where,
      include: include ?? { artists: true, album: true, access: true },
    });
    if (tracksToDelete.length === 0) return [];

    await this.prisma.client.track.deleteMany({
      where: { id: { in: tracksToDelete.map((track) => track.id) } },
    });

    return tracksToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a track by the given ID.
   * @param id - The ID of the track to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted track.
   */
  async softDelete<I extends TrackInclude>(
    id: string,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>> {
    return await this.prisma.client.track.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  /**
   * Soft deletes multiple tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param include - The relations to include in the result.
   * @returns The deleted tracks.
   */
  async softDeleteMany<I extends TrackInclude>(
    where: TrackWhereInput,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    const tracksToDelete = await this.prisma.client.track.findMany({
      where,
      include: include ?? { artists: true, album: true, access: true },
    });
    if (tracksToDelete.length === 0) return [];

    const trackIds = tracksToDelete.map((track) => track.id);
    await this.prisma.client.track.updateMany({
      where: { id: { in: trackIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.track.findMany({
      where: { id: { in: trackIds } },
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted track by the given ID.
   * @param id - The ID of the track to restore.
   * @param include - The relations to include in the result.
   * @returns The restored track.
   */
  async restore<I extends TrackInclude>(
    id: string,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>> {
    return await this.prisma.client.track.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { artists: true, album: true, access: true },
    });
  }

  /**
   * Restores multiple soft deleted tracks by the given where conditions.
   * @param where - The where conditions to filter the tracks by.
   * @param include - The relations to include in the result.
   * @returns The restored tracks.
   */
  async restoreMany<I extends TrackInclude>(
    where: TrackWhereInput,
    include?: I,
  ): Promise<TrackGetPayload<{ include: I }>[]> {
    const tracksToRestore = await this.prisma.client.track.findMany({
      where,
      include: include ?? { artists: true, album: true, access: true },
    });
    if (tracksToRestore.length === 0) return [];

    const trackIds = tracksToRestore.map((track) => track.id);
    await this.prisma.client.track.updateMany({
      where: { id: { in: trackIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.track.findMany({
      where: { id: { in: trackIds } },
      include: include ?? { artists: true, album: true, access: true },
    });
  }
}
