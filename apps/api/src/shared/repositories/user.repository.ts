import { Injectable } from '@nestjs/common';
import {
  EmailType,
  Prisma,
  User,
  UserCreateInput,
  UserOrderByWithRelationInput,
  UserUpdateInput,
  UserWhereInput,
  UserGetPayload,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<User | null>;
  async getById<T extends Prisma.UserInclude>(
    id: string,
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.UserInclude },
  ): Promise<User | UserGetPayload<{ include: Prisma.UserInclude }> | null> {
    const row = await this.prisma.client.user.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByUsername(username: string): Promise<User | null>;
  async getByUsername<T extends Prisma.UserInclude>(
    username: string,
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }> | null>;
  /**
   * Gets a single user by username.
   * @param username Username to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByUsername(
    username: string,
    options?: { include: Prisma.UserInclude },
  ): Promise<User | UserGetPayload<{ include: Prisma.UserInclude }> | null> {
    const row = await this.prisma.client.user.findUnique({
      where: { username },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByEmail(email: string): Promise<User | null>;
  async getByEmail<T extends Prisma.UserInclude>(
    email: string,
    options: { userInclude: T },
  ): Promise<UserGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by email address.
   * @param email Email address to look up.
   * @param options Optional nested include options for the related user payload (`userInclude`).
   * @returns Matching record when found, otherwise null.
   */
  async getByEmail(
    email: string,
    options?: { userInclude: Prisma.UserInclude },
  ): Promise<User | UserGetPayload<{ include: Prisma.UserInclude }> | null> {
    const emailAddress = await this.prisma.client.emailAddress.findUnique({
      where: { email },
      include: {
        user: options?.userInclude ? { include: options.userInclude } : true,
      },
    });
    if (
      !emailAddress ||
      emailAddress.deletedAt ||
      emailAddress.type !== EmailType.primary ||
      !emailAddress.user ||
      emailAddress.user.deletedAt
    ) {
      return null;
    }

    return emailAddress.user;
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: UserWhereInput,
    orderBy?: UserOrderByWithRelationInput,
  ): Promise<User[]>;
  async getPaginated<T extends Prisma.UserInclude>(
    page: number,
    limit: number,
    filter: UserWhereInput | undefined,
    orderBy: UserOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }>[]>;
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getPaginated<T extends Prisma.UserInclude>(
    page: number,
    limit: number,
    filter?: UserWhereInput,
    orderBy?: UserOrderByWithRelationInput,
    options?: { include: T },
  ): Promise<User[] | UserGetPayload<{ include: T }>[]> {
    return await this.prisma.client.user.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt: null,
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
    const count = await this.prisma.client.user.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: UserWhereInput): Promise<number> {
    return await this.prisma.client.user.count({
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

  async create(data: UserCreateInput): Promise<User>;
  async create<T extends Prisma.UserInclude>(
    data: UserCreateInput,
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: UserCreateInput,
    options?: { include: Prisma.UserInclude },
  ): Promise<User | UserGetPayload<{ include: Prisma.UserInclude }>> {
    return await this.prisma.client.user.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.UserCreateManyInput[]): Promise<User[]>;
  async createMany<T extends Prisma.UserInclude>(
    data: Prisma.UserCreateManyInput[],
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.UserCreateManyInput[],
    options?: { include: Prisma.UserInclude },
  ): Promise<User[] | UserGetPayload<{ include: Prisma.UserInclude }>[]> {
    return await this.prisma.client.user.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: UserUpdateInput): Promise<User>;
  async update<T extends Prisma.UserInclude>(
    id: string,
    data: UserUpdateInput,
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }>>;
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
    data: UserUpdateInput,
    options?: { include: Prisma.UserInclude },
  ): Promise<User | UserGetPayload<{ include: Prisma.UserInclude }>> {
    return await this.prisma.client.user.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: UserUpdateInput }[]): Promise<User[]>;
  async updateMany<T extends Prisma.UserInclude>(
    updates: { id: string; data: UserUpdateInput }[],
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: UserUpdateInput }[],
    options?: { include: Prisma.UserInclude },
  ): Promise<User[] | UserGetPayload<{ include: Prisma.UserInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.user.update({
          where: { id },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
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
  async delete(id: string): Promise<User> {
    return await this.prisma.client.user.delete({
      where: { id },
    });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<User> {
    return await this.prisma.client.user.update({
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
  async deleteMany(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    const usersToDelete = await this.prisma.client.user.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.user.deleteMany({
      where: { id: { in: ids } },
    });
    return usersToDelete;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    const usersToSoftDelete = await this.prisma.client.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.user.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return usersToSoftDelete;
  }
}
