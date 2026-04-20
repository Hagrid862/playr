import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  SessionCreateInput,
  SessionCreateManyInput,
  SessionGetPayload,
  SessionInclude,
  SessionOrderByWithRelationInput,
  SessionUpdateInput,
  SessionWhereInput,
} from '@repo/db';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single session by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param include - The relations to include in the result.
   * @returns The found session or null if not found.
   */
  async findOne<I extends SessionInclude>(
    where: SessionWhereInput,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }> | null> {
    return await this.prisma.client.session.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { user: true },
    });
  }

  /**
   * Finds multiple sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of sessions to return. Defaults to 10.
   *   - `skip` (number, optional): The number of sessions to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (SessionOrderByWithRelationInput, optional): The order in which to sort the sessions. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found sessions.
   */
  async findMany<I extends SessionInclude>(
    where: SessionWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: SessionOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    return await this.prisma.client.session.findMany({
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
    return await this.prisma.client.session.count({ where: { ...where, deletedAt: null } });
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

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new session.
   * @param data - The data for the session.
   * @param include - The relations to include in the result.
   * @returns The created session.
   */
  async create<I extends SessionInclude>(
    data: SessionCreateInput,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>> {
    return await this.prisma.client.session.create({ data, include: include ?? { user: true } });
  }

  /**
   * Creates multiple new sessions.
   * @param data - The data for the sessions.
   * @param include - The relations to include in the result.
   * @returns The created sessions.
   */
  async createMany<I extends SessionInclude>(
    data: SessionCreateManyInput[],
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    return await this.prisma.client.session.createManyAndReturn({
      data,
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a session by the given ID.
   * @param id - The ID of the session to update.
   * @param data - The data to update the session with.
   * @param include - The relations to include in the result.
   * @returns The updated session.
   */
  async update<I extends SessionInclude>(
    id: string,
    data: SessionUpdateInput,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>> {
    return await this.prisma.client.session.update({
      where: { id },
      data,
      include: include ?? { user: true },
    });
  }

  /**
   * Updates multiple sessions by the given IDs.
   * @param updates - The updates to apply to the sessions.
   * @param include - The relations to include in the result.
   * @returns The updated sessions.
   */
  async updateMany<I extends SessionInclude>(
    updates: { id: string; data: SessionUpdateInput }[],
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.session.update({
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
   * Deletes a session by the given ID.
   * @param id - The ID of the session to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted session.
   */
  async delete<I extends SessionInclude>(
    id: string,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>> {
    return await this.prisma.client.session.delete({
      where: { id },
      include: include ?? { user: true },
    });
  }

  /**
   * Deletes multiple sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param include - The relations to include in the result.
   * @returns The deleted sessions.
   */
  async deleteMany<I extends SessionInclude>(
    where: SessionWhereInput,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    const sessionsToDelete = await this.prisma.client.session.findMany({
      where,
      include: include ?? { user: true },
    });
    if (sessionsToDelete.length === 0) return [];

    await this.prisma.client.session.deleteMany({
      where: { id: { in: sessionsToDelete.map((session) => session.id) } },
    });

    return sessionsToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a session by the given ID.
   * @param id - The ID of the session to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted session.
   */
  async softDelete<I extends SessionInclude>(
    id: string,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>> {
    return await this.prisma.client.session.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { user: true },
    });
  }

  /**
   * Soft deletes multiple sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param include - The relations to include in the result.
   * @returns The deleted sessions.
   */
  async softDeleteMany<I extends SessionInclude>(
    where: SessionWhereInput,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    const sessionsToDelete = await this.prisma.client.session.findMany({
      where,
      include: include ?? { user: true },
    });
    if (sessionsToDelete.length === 0) return [];

    const sessionIds = sessionsToDelete.map((session) => session.id);
    await this.prisma.client.session.updateMany({
      where: { id: { in: sessionIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.session.findMany({
      where: { id: { in: sessionIds } },
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted session by the given ID.
   * @param id - The ID of the session to restore.
   * @param include - The relations to include in the result.
   * @returns The restored session.
   */
  async restore<I extends SessionInclude>(
    id: string,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>> {
    return await this.prisma.client.session.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { user: true },
    });
  }

  /**
   * Restores multiple soft deleted sessions by the given where conditions.
   * @param where - The where conditions to filter the sessions by.
   * @param include - The relations to include in the result.
   * @returns The restored sessions.
   */
  async restoreMany<I extends SessionInclude>(
    where: SessionWhereInput,
    include?: I,
  ): Promise<SessionGetPayload<{ include: I }>[]> {
    const sessionsToRestore = await this.prisma.client.session.findMany({
      where,
      include: include ?? { user: true },
    });
    if (sessionsToRestore.length === 0) return [];

    const sessionIds = sessionsToRestore.map((session) => session.id);
    await this.prisma.client.session.updateMany({
      where: { id: { in: sessionIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.session.findMany({
      where: { id: { in: sessionIds } },
      include: include ?? { user: true },
    });
  }
}
