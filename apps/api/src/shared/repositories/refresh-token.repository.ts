import { Injectable } from '@nestjs/common';
import {
  RefreshToken,
  RefreshTokenCreateInput,
  RefreshTokenCreateManyInput,
  RefreshTokenGetPayload,
  RefreshTokenInclude,
  RefreshTokenOrderByWithRelationInput,
  RefreshTokenUpdateInput,
  RefreshTokenWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single refresh token by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @returns The found refresh token or null if not found.
   */
  async findOne(
    where: RefreshTokenWhereInput,
  ): Promise<RefreshTokenGetPayload<{ include: { session: true } }> | null> {
    return this.prisma.client.refreshToken.findFirst({
      where: { ...where, deletedAt: null },
      include: { session: true },
    });
  }

  /**
   * Finds a single refresh token by the given where conditions with relations.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param include - The relations to include in the result.
   * @returns The found refresh token with relations or null if not found.
   */
  async findOneWithInclude<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    include: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }> | null> {
    return this.prisma.client.refreshToken.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of refresh tokens to return. Defaults to 10.
   *   - `skip` (number, optional): The number of refresh tokens to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (RefreshTokenOrderByWithRelationInput or array of it, optional): The order in which to sort the refresh tokens. Defaults to descending by `createdAt`.
   * @returns The found refresh tokens.
   */
  async findMany(
    where: RefreshTokenWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[];
    },
  ): Promise<RefreshTokenGetPayload<{ include: { session: true } }>[]> {
    return this.prisma.client.refreshToken.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { session: true },
    });
  }

  /**
   * Finds multiple refresh tokens by the given where conditions with relations.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of refresh tokens to return. Defaults to 10.
   *   - `skip` (number, optional): The number of refresh tokens to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (RefreshTokenOrderByWithRelationInput or array of it, optional): The order in which to sort the refresh tokens. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found refresh tokens with relations.
   */
  async findManyWithInclude<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: RefreshTokenOrderByWithRelationInput | RefreshTokenOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    return this.prisma.client.refreshToken.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a refresh token exists by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @returns True if the refresh token exists, false otherwise.
   */
  async exists(where: RefreshTokenWhereInput): Promise<boolean> {
    const count = await this.prisma.client.refreshToken.count({
      where: { ...where, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Counts the number of refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @returns The number of refresh tokens.
   */
  async count(where?: RefreshTokenWhereInput): Promise<number> {
    return this.prisma.client.refreshToken.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to a refresh token by the given conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param userId - The ID of the user to check.
   * @returns True if the user owns the token's session, false otherwise.
   */
  async checkAccess(where: RefreshTokenWhereInput, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const token = await this.prisma.client.refreshToken.findFirst({
      where: { ...where, deletedAt: null, session: { userId, deletedAt: null } },
      select: { id: true },
    });
    return !!token;
  }

  /**
   * Creates a new refresh token.
   * @param data - The data for the refresh token.
   * @returns The created refresh token.
   */
  async create(data: RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.create({
      data,
    });
  }

  /**
   * Creates multiple new refresh tokens.
   * @param data - The data for the refresh tokens.
   * @returns The created refresh tokens.
   */
  async createMany(data: RefreshTokenCreateManyInput[]): Promise<RefreshToken[]> {
    return this.prisma.client.refreshToken.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a refresh token by the given ID.
   * @param id - The ID of the refresh token to update.
   * @param data - The data to update the refresh token with.
   * @returns The updated refresh token.
   */
  async update(id: string, data: RefreshTokenUpdateInput): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple refresh tokens by the given IDs.
   * @param updates - The updates to apply to the refresh tokens.
   * @returns The updated refresh tokens.
   */
  async updateMany(
    updates: { id: string; data: RefreshTokenUpdateInput }[],
  ): Promise<RefreshToken[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.refreshToken.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes a refresh token by the given ID.
   * @param id - The ID of the refresh token to delete.
   * @returns The deleted refresh token.
   */
  async delete(id: string): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple refresh tokens by the given where conditions.
   * @param filter - The where conditions to filter the refresh tokens by.
   * @returns The deleted refresh tokens.
   */
  async deleteMany(filter: RefreshTokenWhereInput): Promise<RefreshToken[]> {
    const combinedWhere: RefreshTokenWhereInput = {
      ...filter,
      deletedAt: filter.deletedAt ?? null,
    };
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.refreshToken.findMany({
        where: combinedWhere,
      });

      if (toDelete.length === 0) return [];

      await tx.refreshToken.deleteMany({
        where: { id: { in: toDelete.map((row) => row.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes a refresh token by the given ID.
   * @param id - The ID of the refresh token to soft delete.
   * @returns The deleted refresh token.
   */
  async softDelete(id: string): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @returns The deleted refresh tokens.
   */
  async softDeleteMany(where: RefreshTokenWhereInput): Promise<RefreshToken[]> {
    return this.prisma.client.refreshToken.updateManyAndReturn({
      where: { ...where, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restores a soft deleted refresh token by the given ID.
   * @param id - The ID of the refresh token to restore.
   * @returns The restored refresh token.
   */
  async restore(id: string): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @returns The restored refresh tokens.
   */
  async restoreMany(where: RefreshTokenWhereInput): Promise<RefreshToken[]> {
    return this.prisma.client.refreshToken.updateManyAndReturn({
      where: { ...where, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * revokes refresh token in database based on given token id.
   * @param id - The id of token that should be revoked.
   * @returns The revoked refresh token.
   */
  async revoke(id: string): Promise<RefreshToken | null> {
    const revokedAt = new Date();
    const result = await this.prisma.client.refreshToken.updateMany({
      where: { id, deletedAt: null, revokedAt: null },
      data: {
        revokedAt,
      },
    });
    if (result.count === 0) {
      return null;
    }

    return this.prisma.client.refreshToken.findUnique({ where: { id } });
  }

  /**
   * revokes refresh tokens in database based on owner session id.
   * @param sessionId - The id of session that tokens should be revoked.
   * @returns The revoked refresh token.
   */
  async revokeAllBySessionId(sessionId: string): Promise<RefreshToken[]> {
    const revokedAt = new Date();
    return this.prisma.client.refreshToken.updateManyAndReturn({
      where: { sessionId: sessionId, deletedAt: null, revokedAt: null },
      data: {
        revokedAt: revokedAt,
      },
    });
  }
}
