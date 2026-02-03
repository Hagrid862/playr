import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  User,
  UserWhereInput,
  UserCreateInput,
  UserUpdateInput,
  UserOrderByWithRelationInput,
} from '@repo/db';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<User | null> {
    return await this.prisma.client.user.findUnique({ where: { id } });
  }

  async getByUsername(username: string): Promise<User | null> {
    return await this.prisma.client.user.findUnique({ where: { username } });
  }

  async getByEmail(email: string): Promise<User | null> {
    const emailAddress = await this.prisma.client.emailAddress.findFirst({
      where: {
        email,
        type: 'primary',
      },
      include: {
        user: true,
      },
    });

    return emailAddress?.user ?? null;
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: UserWhereInput,
    orderBy?: UserOrderByWithRelationInput,
  ): Promise<User[]> {
    return await this.prisma.client.user.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: filter,
      orderBy,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.user.count({ where: { id } });
    return count > 0;
  }

  async count(filter?: UserWhereInput): Promise<number> {
    return await this.prisma.client.user.count({ where: filter });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(user: UserCreateInput): Promise<User> {
    return await this.prisma.client.user.create({ data: user });
  }

  async createMany(users: UserCreateInput[]): Promise<User[]> {
    return await this.prisma.client.user.createManyAndReturn({ data: users });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, user: UserUpdateInput): Promise<User> {
    return await this.prisma.client.user.update({ data: user, where: { id } });
  }

  async updateMany(updates: { id: string; data: UserUpdateInput }[]): Promise<User[]> {
    return await this.prisma.client.$transaction(
      updates.map(({ id, data }) => this.prisma.client.user.update({ where: { id }, data })),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<User> {
    return await this.prisma.client.user.delete({ where: { id } });
  }

  async deleteMany(filter: UserWhereInput): Promise<User[]> {
    const usersToDelete = await this.prisma.client.user.findMany({ where: filter });
    await this.prisma.client.user.deleteMany({ where: filter });
    return usersToDelete;
  }
}
