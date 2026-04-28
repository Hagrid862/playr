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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.session.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

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
  async createMany(
    data: Prisma.SessionCreateManyInput[],
    options?: { include: Prisma.SessionInclude },
  ): Promise<
    Session[] | SessionGetPayload<{ include: Prisma.SessionInclude }>[]
  > {
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

  async updateMany(
    updates: { id: string; data: SessionUpdateInput }[],
  ): Promise<Session[]>;
  async updateMany<T extends Prisma.SessionInclude>(
    updates: { id: string; data: SessionUpdateInput }[],
    options: { include: T },
  ): Promise<SessionGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: SessionUpdateInput }[],
    options?: { include: Prisma.SessionInclude },
  ): Promise<
    Session[] | SessionGetPayload<{ include: Prisma.SessionInclude }>[]
  > {
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

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Session> {
    return await this.prisma.client.session.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<Session> {
    return await this.prisma.client.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Removes expired or revoked sessions from storage (not soft-delete). */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.client.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    return result.count;
  }
}
