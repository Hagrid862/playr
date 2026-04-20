import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  UserCreateManyInput,
  UserCreateInput,
  UserGetPayload,
  UserInclude,
  UserOrderByWithRelationInput,
  UserUpdateInput,
  UserWhereInput,
} from '@repo/db';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single user by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @param include - The relations to include in the result.
   * @returns The found user or null if not found.
   */
  async findOne<I extends UserInclude>(
    where: UserWhereInput,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }> | null> {
    return await this.prisma.client.user.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { avatar: true },
    });
  }

  /**
   * Finds multiple users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of users to return. Defaults to 10.
   *   - `skip` (number, optional): The number of users to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (UserOrderByWithRelationInput, optional): The order in which to sort the users. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found users.
   */
  async findMany<I extends UserInclude>(
    where: UserWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: UserOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    return await this.prisma.client.user.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { avatar: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.user.count({ where: { ...where, deletedAt: null } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new user.
   * @param data - The data for the user.
   * @param include - The relations to include in the result.
   * @returns The created user.
   */
  async create<I extends UserInclude>(
    data: UserCreateInput,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>> {
    return await this.prisma.client.user.create({ data, include: include ?? { avatar: true } });
  }

  /**
   * Creates multiple new users.
   * @param data - The data for the users.
   * @param include - The relations to include in the result.
   * @returns The created users.
   */
  async createMany<I extends UserInclude>(
    data: UserCreateManyInput[],
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    return await this.prisma.client.user.createManyAndReturn({
      data,
      include: include ?? { avatar: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates a user by the given ID.
   * @param id - The ID of the user to update.
   * @param data - The data to update the user with.
   * @param include - The relations to include in the result.
   * @returns The updated user.
   */
  async update<I extends UserInclude>(
    id: string,
    data: UserUpdateInput,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>> {
    return await this.prisma.client.user.update({
      where: { id },
      data,
      include: include ?? { avatar: true },
    });
  }

  /**
   * Updates multiple users by the given IDs.
   * @param updates - The updates to apply to the users.
   * @param include - The relations to include in the result.
   * @returns The updated users.
   */
  async updateMany<I extends UserInclude>(
    updates: { id: string; data: UserUpdateInput }[],
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.user.update({
          where: { id },
          data,
          include: include ?? { avatar: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes a user by the given ID.
   * @param id - The ID of the user to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted user.
   */
  async delete<I extends UserInclude>(
    id: string,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>> {
    return await this.prisma.client.user.delete({
      where: { id },
      include: include ?? { avatar: true },
    });
  }

  /**
   * Deletes multiple users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @param include - The relations to include in the result.
   * @returns The deleted users.
   */
  async deleteMany<I extends UserInclude>(
    where: UserWhereInput,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    const usersToDelete = await this.prisma.client.user.findMany({
      where,
      include: include ?? { avatar: true },
    });
    if (usersToDelete.length === 0) return [];

    await this.prisma.client.user.deleteMany({
      where: { id: { in: usersToDelete.map((user) => user.id) } },
    });

    return usersToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a user by the given ID.
   * @param id - The ID of the user to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted user.
   */
  async softDelete<I extends UserInclude>(
    id: string,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>> {
    return await this.prisma.client.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { avatar: true },
    });
  }

  /**
   * Soft deletes multiple users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @param include - The relations to include in the result.
   * @returns The deleted users.
   */
  async softDeleteMany<I extends UserInclude>(
    where: UserWhereInput,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    const usersToDelete = await this.prisma.client.user.findMany({
      where,
      include: include ?? { avatar: true },
    });
    if (usersToDelete.length === 0) return [];

    const userIds = usersToDelete.map((user) => user.id);
    await this.prisma.client.user.updateMany({
      where: { id: { in: userIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.user.findMany({
      where: { id: { in: userIds } },
      include: include ?? { avatar: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted user by the given ID.
   * @param id - The ID of the user to restore.
   * @param include - The relations to include in the result.
   * @returns The restored user.
   */
  async restore<I extends UserInclude>(
    id: string,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>> {
    return await this.prisma.client.user.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { avatar: true },
    });
  }

  /**
   * Restores multiple soft deleted users by the given where conditions.
   * @param where - The where conditions to filter the users by.
   * @param include - The relations to include in the result.
   * @returns The restored users.
   */
  async restoreMany<I extends UserInclude>(
    where: UserWhereInput,
    include?: I,
  ): Promise<UserGetPayload<{ include: I }>[]> {
    const usersToRestore = await this.prisma.client.user.findMany({
      where,
      include: include ?? { avatar: true },
    });
    if (usersToRestore.length === 0) return [];

    const userIds = usersToRestore.map((user) => user.id);
    await this.prisma.client.user.updateMany({
      where: { id: { in: userIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.user.findMany({
      where: { id: { in: userIds } },
      include: include ?? { avatar: true },
    });
  }
}
