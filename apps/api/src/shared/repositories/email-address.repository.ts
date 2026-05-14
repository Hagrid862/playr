import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  EmailAddress,
  EmailAddressCreateInput,
  EmailAddressGetPayload,
  EmailAddressUpdateInput,
  EmailAddressWhereInput,
  EmailStatus,
  EmailType,
  Prisma,
  User,
  UserGetPayload,
} from '@repo/db';

@Injectable()
export class EmailAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<EmailAddress | null>;
  async getById<T extends Prisma.EmailAddressInclude>(
    id: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }> | null
  > {
    const row = await this.prisma.client.emailAddress.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByEmail(email: string): Promise<EmailAddress | null>;
  async getByEmail<T extends Prisma.EmailAddressInclude>(
    email: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by email address.
   * @param email Email address to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByEmail(
    email: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }> | null
  > {
    const row = await this.prisma.client.emailAddress.findUnique({
      where: { email },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }
  async getPrimaryByEmailWithUser(email: string): Promise<(EmailAddress & { user: User }) | null>;
  async getPrimaryByEmailWithUser<T extends Prisma.UserInclude>(
    email: string,
    options: { includeUser: T },
  ): Promise<(EmailAddress & { user: UserGetPayload<{ include: T }> }) | null>;
  /**
   * Gets the primary email record with its active user for an email address.
   * @param email Email address to look up.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getPrimaryByEmailWithUser(
    email: string,
    options?: { includeUser?: Prisma.UserInclude },
  ): Promise<
    | (EmailAddress & { user: User })
    | (EmailAddress & { user: UserGetPayload<{ include: Prisma.UserInclude }> })
    | null
  > {
    const row = await this.prisma.client.emailAddress.findUnique({
      where: { email },
      include: {
        user: options?.includeUser ? { include: options.includeUser } : true,
      },
    });
    if (
      !row ||
      row.deletedAt ||
      row.type !== EmailType.primary ||
      !row.user ||
      row.user.deletedAt
    ) {
      return null;
    }
    return row;
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: EmailAddressWhereInput,
    orderBy?: Prisma.EmailAddressOrderByWithRelationInput,
  ): Promise<EmailAddress[]>;
  async getPaginated<T extends Prisma.EmailAddressInclude>(
    page: number,
    limit: number,
    filter: EmailAddressWhereInput | undefined,
    orderBy: Prisma.EmailAddressOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
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
    filter?: EmailAddressWhereInput,
    orderBy?: Prisma.EmailAddressOrderByWithRelationInput,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
      orderBy: orderBy ?? { createdAt: 'desc' },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getAllByUserId(userId: string): Promise<EmailAddress[]>;
  async getAllByUserId<T extends Prisma.EmailAddressInclude>(
    userId: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Gets all records associated with the provided user ID.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getAllByUserId(
    userId: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, deletedAt: null },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPrimaryByUserId(userId: string): Promise<EmailAddress | null>;
  async getPrimaryByUserId<T extends Prisma.EmailAddressInclude>(
    userId: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }> | null>;
  /**
   * Gets the primary record associated with the provided user ID.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getPrimaryByUserId(
    userId: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }> | null
  > {
    return await this.prisma.client.emailAddress.findFirst({
      where: { userId, type: EmailType.primary, deletedAt: null },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getRecoveryByUserId(userId: string): Promise<EmailAddress[]>;
  async getRecoveryByUserId<T extends Prisma.EmailAddressInclude>(
    userId: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Gets recovery records associated with the provided user ID.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getRecoveryByUserId(
    userId: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, type: EmailType.recovery, deletedAt: null },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getByTypeAndUserId(type: EmailType, userId: string): Promise<EmailAddress[]>;
  async getByTypeAndUserId<T extends Prisma.EmailAddressInclude>(
    type: EmailType,
    userId: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Gets records by type for the provided user ID.
   * @param type Type value to filter by.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getByTypeAndUserId(
    type: EmailType,
    userId: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, type, deletedAt: null },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getByStatusAndUserId(status: EmailStatus, userId: string): Promise<EmailAddress[]>;
  async getByStatusAndUserId<T extends Prisma.EmailAddressInclude>(
    status: EmailStatus,
    userId: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Gets records by status for the provided user ID.
   * @param status Status value to filter by.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getByStatusAndUserId(
    status: EmailStatus,
    userId: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { status, userId, deletedAt: null },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getVerifiedByUserId(userId: string): Promise<EmailAddress[]>;
  async getVerifiedByUserId<T extends Prisma.EmailAddressInclude>(
    userId: string,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Gets verified records associated with the provided user ID.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getVerifiedByUserId(
    userId: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, status: EmailStatus.verified, deletedAt: null },
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
    const count = await this.prisma.client.emailAddress.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Checks whether a record exists for the provided email address.
   * @param email Email address to look up.
   * @returns True when a matching record exists.
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({
      where: { email, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Checks whether a record exists for the provided user ID.
   * @param userId userId to match.
   * @returns True when a matching record exists.
   */
  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({
      where: { userId, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: EmailAddressWhereInput): Promise<number> {
    return await this.prisma.client.emailAddress.count({
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
   * Counts records associated with the provided user ID.
   * @param userId userId to match.
   * @returns Number of matching records.
   */
  async countPerUserId(userId: string): Promise<number> {
    return await this.prisma.client.emailAddress.count({
      where: { userId, deletedAt: null },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: EmailAddressCreateInput): Promise<EmailAddress>;
  async create<T extends Prisma.EmailAddressInclude>(
    data: EmailAddressCreateInput,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: EmailAddressCreateInput,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>> {
    return await this.prisma.client.emailAddress.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.EmailAddressCreateManyInput[]): Promise<EmailAddress[]>;
  async createMany<T extends Prisma.EmailAddressInclude>(
    data: Prisma.EmailAddressCreateManyInput[],
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.EmailAddressCreateManyInput[],
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.client.emailAddress.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: EmailAddressUpdateInput): Promise<EmailAddress>;
  async update<T extends Prisma.EmailAddressInclude>(
    id: string,
    data: EmailAddressUpdateInput,
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>>;
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
    data: EmailAddressUpdateInput,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>> {
    return await this.prisma.client.emailAddress.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(
    updates: { id: string; data: EmailAddressUpdateInput }[],
  ): Promise<EmailAddress[]>;
  async updateMany<T extends Prisma.EmailAddressInclude>(
    updates: { id: string; data: EmailAddressUpdateInput }[],
    options: { include: T },
  ): Promise<EmailAddressGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: EmailAddressUpdateInput }[],
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.emailAddress.update({
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
  async delete(id: string): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.update({
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
  async deleteMany(ids: string[]): Promise<EmailAddress[]> {
    if (ids.length === 0) {
      return [];
    }
    const emailAddresses = await this.prisma.client.emailAddress.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.emailAddress.deleteMany({
      where: { id: { in: ids } },
    });
    return emailAddresses;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<EmailAddress[]> {
    if (ids.length === 0) {
      return [];
    }
    const emailAddresses = await this.prisma.client.emailAddress.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.emailAddress.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return emailAddresses;
  }
}
