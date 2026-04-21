import { Injectable } from '@nestjs/common';
import {
  User,
  UserCreateInput,
  UserCreateManyInput,
  UserGetPayload,
  UserInclude,
  UserOrderByWithRelationInput,
  UserUpdateInput,
  UserWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single user by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @returns The found user or null if not found.
   */
  async findOne(
    where: UserWhereInput,
  ): Promise<UserGetPayload<{ include: { avatar: true } }> | null> {
    return this.prisma.client.user.findFirst({
      where: { ...where, deletedAt: null },
      include: { avatar: true },
    });
  }

  /**
   * Finds a single user by the given where conditions with relations.
   * @param where - The where conditions to filter the users by.
   * @param include - The relations to include in the result.
   * @returns The found user with relations or null if not found.
   */
  async findOneWithInclude<I extends UserInclude>(
    where: UserWhereInput,
    include: I,
  ): Promise<UserGetPayload<{ include: I }> | null> {
    return this.prisma.client.user.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of users to return. Defaults to 10.
   *   - `skip` (number, optional): The number of users to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (UserOrderByWithRelationInput, optional): The order in which to sort the users. Defaults to descending by `createdAt`.
   * @returns The found users.
   */
  async findMany(
    where: UserWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: UserOrderByWithRelationInput;
    },
  ): Promise<UserGetPayload<{ include: { avatar: true } }>[]> {
    return this.prisma.client.user.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { avatar: true },
    });
  }

  /**
   * Finds multiple users by the given where conditions with relations.
   * @param where - The where conditions to filter the users by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of users to return. Defaults to 10.
   *   - `skip` (number, optional): The number of users to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (UserOrderByWithRelationInput, optional): The order in which to sort the users. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found users with relations.
   */
  async findManyWithInclude<I extends UserInclude>(
    where: UserWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: UserOrderByWithRelationInput;
    },
    include: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    return this.prisma.client.user.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if a user exists by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @returns True if the user exists, false otherwise.
   */
  async exists(where: UserWhereInput): Promise<boolean> {
    const count = await this.prisma.client.user.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @returns The number of users.
   */
  async count(where?: UserWhereInput): Promise<number> {
    return this.prisma.client.user.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Creates a new user.
   * @param data - The data for the user.
   * @returns The created user.
   */
  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.client.user.create({
      data,
    });
  }

  /**
   * Creates multiple new users.
   * @param data - The data for the users.
   * @returns The created users.
   */
  async createMany(data: UserCreateManyInput[]): Promise<User[]> {
    return this.prisma.client.user.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates a user by the given ID.
   * @param id - The ID of the user to update.
   * @param data - The data to update the user with.
   * @returns The updated user.
   */
  async update(id: string, data: UserUpdateInput): Promise<User> {
    return this.prisma.client.user.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple users by the given IDs.
   * @param updates - The updates to apply to the users.
   * @returns The updated users.
   */
  async updateMany(updates: { id: string; data: UserUpdateInput }[]): Promise<User[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.user.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes a user by the given ID.
   * @param id - The ID of the user to delete.
   * @returns The deleted user.
   */
  async delete(id: string): Promise<User> {
    return this.prisma.client.user.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple users by the given where conditions.
   * @param filter - The where conditions to filter the users by.
   * @returns The deleted users.
   */
  async deleteMany(filter: UserWhereInput): Promise<User[]> {
    const toDelete = await this.prisma.client.user.findMany({
      where: filter,
    });

    if (toDelete.length === 0) return [];

    await this.prisma.client.user.deleteMany({
      where: { id: { in: toDelete.map((row) => row.id) } },
    });

    return toDelete;
  }

  /**
   * Soft deletes a user by the given ID.
   * @param id - The ID of the user to soft delete.
   * @returns The deleted user.
   */
  async softDelete(id: string): Promise<User> {
    return this.prisma.client.user.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @returns The deleted users.
   */
  async softDeleteMany(where: UserWhereInput): Promise<User[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const rows = await tx.user.findMany({
        where: { ...where, deletedAt: null },
      });
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.user.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt },
      });

      return tx.user.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Restores a soft deleted user by the given ID.
   * @param id - The ID of the user to restore.
   * @returns The restored user.
   */
  async restore(id: string): Promise<User> {
    return this.prisma.client.user.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @returns The restored users.
   */
  async restoreMany(where: UserWhereInput): Promise<User[]> {
    const toRestore = await this.prisma.client.user.findMany({
      where: { ...where, deletedAt: { not: null } },
    });
    if (toRestore.length === 0) return [];

    const ids = toRestore.map((row) => row.id);
    await this.prisma.client.user.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });

    return this.prisma.client.user.findMany({
      where: { id: { in: ids } },
    });
  }
}
