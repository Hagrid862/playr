import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  RefreshTokenCreateInput,
  RefreshTokenCreateManyInput,
  RefreshTokenGetPayload,
  RefreshTokenInclude,
  RefreshTokenOrderByWithRelationInput,
  RefreshTokenUpdateInput,
  RefreshTokenWhereInput,
} from '@repo/db';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single refresh token by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param include - The relations to include in the result.
   * @returns The found refresh token or null if not found.
   */
  async findOne<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }> | null> {
    return await this.prisma.client.refreshToken.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { session: true },
    });
  }

  /**
   * Finds multiple refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of refresh tokens to return. Defaults to 10.
   *   - `skip` (number, optional): The number of refresh tokens to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (RefreshTokenOrderByWithRelationInput, optional): The order in which to sort the refresh tokens. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found refresh tokens.
   */
  async findMany<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: RefreshTokenOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    return await this.prisma.client.refreshToken.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { session: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.refreshToken.count({ where: { ...where, deletedAt: null } });
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
      where: { ...where, deletedAt: null, session: { userId } },
      select: { id: true },
    });
    return !!token;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new refresh token.
   * @param data - The data for the refresh token.
   * @param include - The relations to include in the result.
   * @returns The created refresh token.
   */
  async create<I extends RefreshTokenInclude>(
    data: RefreshTokenCreateInput,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>> {
    return await this.prisma.client.refreshToken.create({
      data,
      include: include ?? { session: true },
    });
  }

  /**
   * Creates multiple new refresh tokens.
   * @param data - The data for the refresh tokens.
   * @param include - The relations to include in the result.
   * @returns The created refresh tokens.
   */
  async createMany<I extends RefreshTokenInclude>(
    data: RefreshTokenCreateManyInput[],
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    return await this.prisma.client.refreshToken.createManyAndReturn({
      data,
      include: include ?? { session: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a refresh token by the given ID.
   * @param id - The ID of the refresh token to update.
   * @param data - The data to update the refresh token with.
   * @param include - The relations to include in the result.
   * @returns The updated refresh token.
   */
  async update<I extends RefreshTokenInclude>(
    id: string,
    data: RefreshTokenUpdateInput,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>> {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data,
      include: include ?? { session: true },
    });
  }

  /**
   * Updates multiple refresh tokens by the given IDs.
   * @param updates - The updates to apply to the refresh tokens.
   * @param include - The relations to include in the result.
   * @returns The updated refresh tokens.
   */
  async updateMany<I extends RefreshTokenInclude>(
    updates: { id: string; data: RefreshTokenUpdateInput }[],
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.refreshToken.update({
          where: { id },
          data,
          include: include ?? { session: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes a refresh token by the given ID.
   * @param id - The ID of the refresh token to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted refresh token.
   */
  async delete<I extends RefreshTokenInclude>(
    id: string,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>> {
    return await this.prisma.client.refreshToken.delete({
      where: { id },
      include: include ?? { session: true },
    });
  }

  /**
   * Deletes multiple refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param include - The relations to include in the result.
   * @returns The deleted refresh tokens.
   */
  async deleteMany<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    const refreshTokensToDelete = await this.prisma.client.refreshToken.findMany({
      where,
      include: include ?? { session: true },
    });
    if (refreshTokensToDelete.length === 0) return [];

    await this.prisma.client.refreshToken.deleteMany({
      where: { id: { in: refreshTokensToDelete.map((token) => token.id) } },
    });

    return refreshTokensToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a refresh token by the given ID.
   * @param id - The ID of the refresh token to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted refresh token.
   */
  async softDelete<I extends RefreshTokenInclude>(
    id: string,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>> {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { session: true },
    });
  }

  /**
   * Soft deletes multiple refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param include - The relations to include in the result.
   * @returns The deleted refresh tokens.
   */
  async softDeleteMany<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    const refreshTokensToDelete = await this.prisma.client.refreshToken.findMany({
      where,
      include: include ?? { session: true },
    });
    if (refreshTokensToDelete.length === 0) return [];

    const refreshTokenIds = refreshTokensToDelete.map((token) => token.id);
    await this.prisma.client.refreshToken.updateMany({
      where: { id: { in: refreshTokenIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.refreshToken.findMany({
      where: { id: { in: refreshTokenIds } },
      include: include ?? { session: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted refresh token by the given ID.
   * @param id - The ID of the refresh token to restore.
   * @param include - The relations to include in the result.
   * @returns The restored refresh token.
   */
  async restore<I extends RefreshTokenInclude>(
    id: string,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>> {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { session: true },
    });
  }

  /**
   * Restores multiple soft deleted refresh tokens by the given where conditions.
   * @param where - The where conditions to filter the refresh tokens by.
   * @param include - The relations to include in the result.
   * @returns The restored refresh tokens.
   */
  async restoreMany<I extends RefreshTokenInclude>(
    where: RefreshTokenWhereInput,
    include?: I,
  ): Promise<RefreshTokenGetPayload<{ include: I }>[]> {
    const refreshTokensToRestore = await this.prisma.client.refreshToken.findMany({
      where,
      include: include ?? { session: true },
    });
    if (refreshTokensToRestore.length === 0) return [];

    const refreshTokenIds = refreshTokensToRestore.map((token) => token.id);
    await this.prisma.client.refreshToken.updateMany({
      where: { id: { in: refreshTokenIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.refreshToken.findMany({
      where: { id: { in: refreshTokenIds } },
      include: include ?? { session: true },
    });
  }
}
