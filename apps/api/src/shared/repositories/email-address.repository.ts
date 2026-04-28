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
  async getById(
    id: string,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }> | null> {
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

  /** Primary email row for login / verification flows (includes user). */
  async getPrimaryByEmailWithUser(email: string): Promise<(EmailAddress & { user: User }) | null>;
  async getPrimaryByEmailWithUser<T extends Prisma.UserInclude>(
    email: string,
    options: { includeUser: T },
  ): Promise<(EmailAddress & { user: UserGetPayload<{ include: T }> }) | null>;
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
  async getPaginated(
    page: number,
    limit: number,
    filter?: EmailAddressWhereInput,
    orderBy?: Prisma.EmailAddressOrderByWithRelationInput,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]
  > {
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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({
      where: { email, deletedAt: null },
    });
    return count > 0;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({
      where: { userId, deletedAt: null },
    });
    return count > 0;
  }

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
  async create(
    data: EmailAddressCreateInput,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>
  > {
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
  async createMany(
    data: Prisma.EmailAddressCreateManyInput[],
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]
  > {
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
  async update(
    id: string,
    data: EmailAddressUpdateInput,
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>
  > {
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
  async updateMany(
    updates: { id: string; data: EmailAddressUpdateInput }[],
    options?: { include: Prisma.EmailAddressInclude },
  ): Promise<
    EmailAddress[] | EmailAddressGetPayload<{ include: Prisma.EmailAddressInclude }>[]
  > {
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

  async delete(id: string): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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
