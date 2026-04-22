import { Injectable } from '@nestjs/common';
import {
  Session,
  SessionCreateInput,
  SessionCreateManyInput,
  SessionGetPayload,
  SessionInclude,
  SessionOrderByWithRelationInput,
  SessionUpdateInput,
  SessionWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single session by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @returns The found session or null if not found.
   */
  async findOne(
    where: SessionWhereInput,
  ): Promise<SessionGetPayload<{ include: { user: true } }> | null> {
    return this.prisma.client.session.findFirst({
      where: { ...where, deletedAt: null },
      include: { user: true },
    });
  }

  /**
   * Finds a single session by the given where conditions with relations.
   * @param where - The where conditions to filter the sessions by.
   * @param include - The relations to include in the result.
   * @returns The found session with relations or null if not found.
   */
  async findOneWithInclude<I extends SessionInclude>(
    where: SessionWhereInput,
    include: I,
  ): Promise<SessionGetPayload<{ include: I }> | null> {
    return this.prisma.client.session.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of sessions to return. Defaults to 10.
   *   - `skip` (number, optional): The number of sessions to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (SessionOrderByWithRelationInput or array of it, optional): The order in which to sort the sessions. Defaults to descending by `createdAt`.
   * @returns The found sessions.
   */
  async findMany(
    where: SessionWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[];
    },
  ): Promise<SessionGetPayload<{ include: { user: true } }>[]> {
    return this.prisma.client.session.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { user: true },
    });
  }

  /**
   * Finds multiple sessions by the given where conditions with relations.
   * @param where - The where conditions to filter the sessions by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of sessions to return. Defaults to 10.
   *   - `skip` (number, optional): The number of sessions to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (SessionOrderByWithRelationInput or array of it, optional): The order in which to sort the sessions. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found sessions with relations.
   */
  async findManyWithInclude<I extends SessionInclude>(
    where: SessionWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    return this.prisma.client.session.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a session exists by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @returns True if the session exists, false otherwise.
   */
  async exists(where: SessionWhereInput): Promise<boolean> {
    const count = await this.prisma.client.session.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @returns The number of sessions.
   */
  async count(where?: SessionWhereInput): Promise<number> {
    return this.prisma.client.session.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to a session by the given conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param userId - The ID of the user to check.
   * @returns True if the user owns the session, false otherwise.
   */
  async checkAccess(where: SessionWhereInput, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const session = await this.prisma.client.session.findFirst({
      where: { ...where, userId, deletedAt: null },
      select: { id: true },
    });
    return !!session;
  }

  /**
   * Creates a new session.
   * @param data - The data for the session.
   * @returns The created session.
   */
  async create(data: SessionCreateInput): Promise<Session> {
    return this.prisma.client.session.create({
      data,
    });
  }

  /**
   * Creates multiple new sessions.
   * @param data - The data for the sessions.
   * @returns The created sessions.
   */
  async createMany(data: SessionCreateManyInput[]): Promise<Session[]> {
    return this.prisma.client.session.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a session by the given ID.
   * @param id - The ID of the session to update.
   * @param data - The data to update the session with.
   * @returns The updated session.
   */
  async update(id: string, data: SessionUpdateInput): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple sessions by the given IDs.
   * @param updates - The updates to apply to the sessions.
   * @returns The updated sessions.
   */
  async updateMany(updates: { id: string; data: SessionUpdateInput }[]): Promise<Session[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.session.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes a session by the given ID.
   * @param id - The ID of the session to delete.
   * @returns The deleted session.
   */
  async delete(id: string): Promise<Session> {
    return this.prisma.client.session.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple sessions by the given where conditions.
   * @param filter - The where conditions to filter the sessions by.
   * @returns The deleted sessions.
   */
  async deleteMany(filter: SessionWhereInput): Promise<Session[]> {
    const toDelete = await this.prisma.client.session.findMany({
      where: filter,
    });

    if (toDelete.length === 0) return [];

    await this.prisma.client.session.deleteMany({
      where: { id: { in: toDelete.map((row) => row.id) } },
    });

    return toDelete;
  }

  /**
   * Soft deletes a session by the given ID.
   * @param id - The ID of the session to soft delete.
   * @returns The deleted session.
   */
  async softDelete(id: string): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @returns The deleted sessions.
   */
  async softDeleteMany(where: SessionWhereInput): Promise<Session[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const rows = await tx.session.findMany({
        where: { ...where, deletedAt: null },
      });
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.session.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt },
      });

      return tx.session.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Restores a soft deleted session by the given ID.
   * @param id - The ID of the session to restore.
   * @returns The restored session.
   */
  async restore(id: string): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @returns The restored sessions.
   */
  async restoreMany(where: SessionWhereInput): Promise<Session[]> {
    const toRestore = await this.prisma.client.session.findMany({
      where: { ...where, deletedAt: { not: null } },
    });
    if (toRestore.length === 0) return [];

    const ids = toRestore.map((row) => row.id);
    await this.prisma.client.session.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });

    return this.prisma.client.session.findMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * revokes session in database based on given session id.
   * @param id - The id of session that should be revoked.
   * @returns The revoked session.
   */
  async revoke(id: string): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id, deletedAt: null, revokedAt: null },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * revokes sessions in database based on owner user id.
   * @param userId - The id of user that sessions should be revoked.
   * @returns The revoked sessions.
   */
  async revokeAllByUserId(userId: string): Promise<Session[]> {
    const revokedAt = new Date();
    return this.prisma.client.session.updateManyAndReturn({
      where: { userId: userId, deletedAt: null, revokedAt: null },
      data: {
        revokedAt: revokedAt,
      },
    });
  }
}
