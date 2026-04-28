import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Session,
  SessionCreateInput,
  SessionOrderByWithRelationInput,
  SessionUpdateInput,
  SessionWhereInput,
  SessionGetPayload,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}
  private activeSessionWhere(userId: string): SessionWhereInput {
    return {
      userId,
      revokedAt: null,
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Session | null>;
  async getById<T extends Prisma.SessionInclude>(
    id: string,
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session | SessionGetPayload<{ include: Prisma.SessionInclude }> | null> {
    const row = await this.prisma.client.session.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getActiveByUserId(userId: string): Promise<Session[]>;
  async getActiveByUserId<T extends Prisma.SessionInclude>(
    userId: string,
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>[]>;
  /**
   * Gets active sessions for the provided user ID.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getActiveByUserId(
    userId: string,
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session[] | SessionGetPayload<{ include: Prisma.SessionInclude }>[]> {
    return await this.prisma.client.session.findMany({
      where: this.activeSessionWhere(userId),
      orderBy: { createdAt: 'desc' },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: SessionWhereInput,
    orderBy?: SessionOrderByWithRelationInput,
  ): Promise<Session[]>;
  async getPaginated<T extends Prisma.SessionInclude>(
    page: number,
    limit: number,
    filter: SessionWhereInput | undefined,
    orderBy: SessionOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>[]>;
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getPaginated<T extends Prisma.SessionInclude>(
    page: number,
    limit: number,
    filter?: SessionWhereInput,
    orderBy?: SessionOrderByWithRelationInput,
    options?: { include: T },
  ): Promise<Session[] | SessionGetPayload<{ include: T }>[]> {
    return await this.prisma.client.session.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────
  /**
   * Checks whether a matching record currently exists.
   * @param id Record identifier.
   * @returns True when a matching record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.session.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: SessionWhereInput): Promise<number> {
    return await this.prisma.client.session.count({
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
    });
  }
  /**
   * Counts active sessions for the provided user ID.
   * @param userId userId to match.
   * @returns Number of matching records.
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return await this.prisma.client.session.count({
      where: this.activeSessionWhere(userId),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: SessionCreateInput): Promise<Session>;
  async create<T extends Prisma.SessionInclude>(
    data: SessionCreateInput,
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: SessionCreateInput,
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session | SessionGetPayload<{ include: Prisma.SessionInclude }>> {
    return await this.prisma.client.session.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.SessionCreateManyInput[]): Promise<Session[]>;
  async createMany<T extends Prisma.SessionInclude>(
    data: Prisma.SessionCreateManyInput[],
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.SessionCreateManyInput[],
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session[] | SessionGetPayload<{ include: Prisma.SessionInclude }>[]> {
    return await this.prisma.client.session.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: SessionUpdateInput): Promise<Session>;
  async update<T extends Prisma.SessionInclude>(
    id: string,
    data: SessionUpdateInput,
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>>;
  /**
   * Updates an existing record with the provided data.
   * @param id Record identifier.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async update(
    id: string,
    data: SessionUpdateInput,
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session | SessionGetPayload<{ include: Prisma.SessionInclude }>> {
    return await this.prisma.client.session.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: SessionUpdateInput }[]): Promise<Session[]>;
  async updateMany<T extends Prisma.SessionInclude>(
    updates: { id: string; data: SessionUpdateInput }[],
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: SessionUpdateInput }[],
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session[] | SessionGetPayload<{ include: Prisma.SessionInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.session.update({
          where: { id },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
  }

  async revoke(id: string): Promise<Session>;
  async revoke<T extends Prisma.SessionInclude>(
    id: string,
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>>;
  /**
   * Revokes a single record by setting its revocation timestamp.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns The updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async revoke(
    id: string,
    options?: { include: Prisma.SessionInclude },
  ): Promise<Session | SessionGetPayload<{ include: Prisma.SessionInclude }>> {
    return await this.prisma.client.session.update({
      where: { id },
      data: { revokedAt: new Date() },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  /**
   * Revokes all sessions for the provided user ID.
   * @param userId userId to match.
   * @returns The updated record. Includes related entities when `options.include` is provided.
   */
  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────
  /**
   * Permanently deletes a single record by ID.
   * @param id Record identifier.
   * @returns Deleted record.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async delete(id: string): Promise<Session> {
    return await this.prisma.client.session.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Session> {
    return await this.prisma.client.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  /**
   * Permanently deletes multiple records by their IDs.
   * @param ids Record identifiers to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteMany(ids: string[]): Promise<Session[]> {
    if (ids.length === 0) {
      return [];
    }
    const sessions = await this.prisma.client.session.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.session.deleteMany({
      where: { id: { in: ids } },
    });
    return sessions;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Session[]> {
    if (ids.length === 0) {
      return [];
    }
    const sessions = await this.prisma.client.session.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.session.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return sessions;
  }
  /**
   * Permanently deletes expired or revoked sessions.
   * @returns The resulting record after the write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.client.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    return result.count;
  }
}
