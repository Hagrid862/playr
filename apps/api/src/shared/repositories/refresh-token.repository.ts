import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RefreshToken,
  RefreshTokenCreateInput,
  RefreshTokenGetPayload,
  RefreshTokenUpdateInput,
  RefreshTokenWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<RefreshToken | null>;
  async getById<T extends Prisma.RefreshTokenInclude>(
    id: string,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }> | null
  > {
    const row = await this.prisma.client.refreshToken.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByToken(token: string): Promise<RefreshToken | null>;
  async getByToken<T extends Prisma.RefreshTokenInclude>(
    token: string,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }> | null>;
  async getByToken(
    token: string,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }> | null
  > {
    const row = await this.prisma.client.refreshToken.findUnique({
      where: { token },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: RefreshTokenWhereInput,
    orderBy?: Prisma.RefreshTokenOrderByWithRelationInput,
  ): Promise<RefreshToken[]>;
  async getPaginated<T extends Prisma.RefreshTokenInclude>(
    page: number,
    limit: number,
    filter: RefreshTokenWhereInput | undefined,
    orderBy: Prisma.RefreshTokenOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: RefreshTokenWhereInput,
    orderBy?: Prisma.RefreshTokenOrderByWithRelationInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]
  > {
    return await this.prisma.client.refreshToken.findMany({
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
    const count = await this.prisma.client.refreshToken.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async count(filter?: RefreshTokenWhereInput): Promise<number> {
    return await this.prisma.client.refreshToken.count({
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: RefreshTokenCreateInput): Promise<RefreshToken>;
  async create<T extends Prisma.RefreshTokenInclude>(
    data: RefreshTokenCreateInput,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>>;
  async create(
    data: RefreshTokenCreateInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>
  > {
    return await this.prisma.client.refreshToken.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.RefreshTokenCreateManyInput[]): Promise<RefreshToken[]>;
  async createMany<T extends Prisma.RefreshTokenInclude>(
    data: Prisma.RefreshTokenCreateManyInput[],
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.RefreshTokenCreateManyInput[],
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]
  > {
    return await this.prisma.client.refreshToken.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: RefreshTokenUpdateInput): Promise<RefreshToken>;
  async update<T extends Prisma.RefreshTokenInclude>(
    id: string,
    data: RefreshTokenUpdateInput,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: RefreshTokenUpdateInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>
  > {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateByToken(token: string, data: RefreshTokenUpdateInput): Promise<RefreshToken>;
  async updateByToken<T extends Prisma.RefreshTokenInclude>(
    token: string,
    data: RefreshTokenUpdateInput,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>>;
  async updateByToken(
    token: string,
    data: RefreshTokenUpdateInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>
  > {
    return await this.prisma.client.refreshToken.update({
      where: { token },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: RefreshTokenUpdateInput }[],
  ): Promise<RefreshToken[]>;
  async updateMany<T extends Prisma.RefreshTokenInclude>(
    updates: { id: string; data: RefreshTokenUpdateInput }[],
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: RefreshTokenUpdateInput }[],
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.refreshToken.update({
          where: { id },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
  }

  async updateManyByToken(
    updates: { token: string; data: RefreshTokenUpdateInput }[],
  ): Promise<RefreshToken[]>;
  async updateManyByToken<T extends Prisma.RefreshTokenInclude>(
    updates: { token: string; data: RefreshTokenUpdateInput }[],
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>[]>;
  async updateManyByToken(
    updates: { token: string; data: RefreshTokenUpdateInput }[],
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ token, data }) =>
        this.prisma.client.refreshToken.update({
          where: { token },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
  }

  async revoke(id: string): Promise<RefreshToken>;
  async revoke<T extends Prisma.RefreshTokenInclude>(
    id: string,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>>;
  async revoke(
    id: string,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>
  > {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async revokeByToken(token: string): Promise<RefreshToken>;
  async revokeByToken<T extends Prisma.RefreshTokenInclude>(
    token: string,
    options: { include: T },
  ): Promise<RefreshTokenGetPayload<{ include: T }>>;
  async revokeByToken(
    token: string,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<
    RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>
  > {
    return await this.prisma.client.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.delete({ where: { id } });
  }

  async deleteByToken(token: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.delete({ where: { token } });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<RefreshToken[]> {
    if (ids.length === 0) {
      return [];
    }
    const tokens = await this.prisma.client.refreshToken.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.refreshToken.deleteMany({
      where: { id: { in: ids } },
    });
    return tokens;
  }

  /** Hard-delete by raw token values. No-op when `tokens` is empty. */
  async deleteManyByToken(tokens: string[]): Promise<RefreshToken[]> {
    if (tokens.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.refreshToken.findMany({
      where: { token: { in: tokens } },
    });
    await this.prisma.client.refreshToken.deleteMany({
      where: { token: { in: tokens } },
    });
    return rows;
  }

  async softDelete(id: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteByToken(token: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.update({
      where: { token },
      data: { deletedAt: new Date() },
    });
  }

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
  async softDeleteMany(ids: string[]): Promise<RefreshToken[]> {
    if (ids.length === 0) {
      return [];
    }
    const tokens = await this.prisma.client.refreshToken.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.refreshToken.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return tokens;
  }

  /** Soft-delete by raw token values. No-op when `tokens` is empty. */
  async softDeleteManyByToken(tokens: string[]): Promise<RefreshToken[]> {
    if (tokens.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.refreshToken.findMany({
      where: { token: { in: tokens }, deletedAt: null },
    });
    await this.prisma.client.refreshToken.updateMany({
      where: { token: { in: tokens }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return rows;
  }
}
