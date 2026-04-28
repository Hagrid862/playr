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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.user.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

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

  async updateMany(
    updates: { id: string; data: UserUpdateInput }[],
  ): Promise<User[]>;
  async updateMany<T extends Prisma.UserInclude>(
    updates: { id: string; data: UserUpdateInput }[],
    options: { include: T },
  ): Promise<UserGetPayload<{ include: T }>[]>;
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

  async delete(id: string): Promise<User> {
    return await this.prisma.client.user.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<User> {
    return await this.prisma.client.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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
