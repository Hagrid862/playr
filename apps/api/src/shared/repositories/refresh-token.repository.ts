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
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
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
  /**
   * Gets a single record by token.
   * @param token Token value to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
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
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getPaginated(
    page: number,
    limit: number,
    filter?: RefreshTokenWhereInput,
    orderBy?: Prisma.RefreshTokenOrderByWithRelationInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]> {
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
  /**
   * Checks whether a matching record currently exists.
   * @param id Record identifier.
   * @returns True when a matching record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.refreshToken.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
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
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: RefreshTokenCreateInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>> {
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
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.RefreshTokenCreateManyInput[],
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]> {
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
    data: RefreshTokenUpdateInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>> {
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
  /**
   * Updates a single record identified by token.
   * @param token Token value to look up.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns The updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async updateByToken(
    token: string,
    data: RefreshTokenUpdateInput,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>> {
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
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: RefreshTokenUpdateInput }[],
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]> {
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
  /**
   * Updates multiple records identified by token.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async updateManyByToken(
    updates: { token: string; data: RefreshTokenUpdateInput }[],
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken[] | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>[]> {
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
  /**
   * Revokes a single record by setting its revocation timestamp.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns The updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async revoke(
    id: string,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>> {
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
  /**
   * Revokes a single record identified by token.
   * @param token Token value to look up.
   * @param options Optional include or query options.
   * @returns The updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async revokeByToken(
    token: string,
    options?: { include: Prisma.RefreshTokenInclude },
  ): Promise<RefreshToken | RefreshTokenGetPayload<{ include: Prisma.RefreshTokenInclude }>> {
    return await this.prisma.client.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  /**
   * Revokes all records associated with the provided session ID.
   * @param sessionId sessionId to match.
   * @returns The updated record. Includes related entities when `options.include` is provided.
   */
  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
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
  async delete(id: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.delete({ where: { id } });
  }
  /**
   * Permanently deletes a single record by token.
   * @param token Token value to look up.
   * @returns Deleted record.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteByToken(token: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.delete({ where: { token } });
  }
  /**
   * Permanently deletes multiple records by their IDs.
   * @param ids Record identifiers to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
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
  /**
   * Permanently deletes multiple records by token.
   * @param tokens Token values to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
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
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  /**
   * Soft-deletes a single record identified by token.
   * @param token Token value to look up.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDeleteByToken(token: string): Promise<RefreshToken> {
    return await this.prisma.client.refreshToken.update({
      where: { token },
      data: { deletedAt: new Date() },
    });
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
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
  /**
   * Soft-deletes multiple records identified by token.
   * @param tokens Token values to match.
   * @returns The resulting record after the write operation.
   */
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
