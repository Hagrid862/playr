import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma/prisma.service';
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

  async GetById(id: string): Promise<User | null> {
    return await this.prisma.client.user.findUnique({ where: { id } });
  }

  async GetByUsername(username: string): Promise<User | null> {
    return await this.prisma.client.user.findUnique({ where: { username } });
  }

  async GetByEmail(email: string): Promise<User | null> {
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

  async GetPaginated(
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

  async Count(filter?: UserWhereInput): Promise<number> {
    return await this.prisma.client.user.count({ where: filter });
  }

  async Exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.user.count({ where: { id } });
    return count > 0;
  }

  async Create(user: UserCreateInput): Promise<User> {
    return await this.prisma.client.user.create({ data: user });
  }

  async CreateMany(users: UserCreateInput[]): Promise<User[]> {
    return await this.prisma.client.user.createManyAndReturn({ data: users });
  }

  async Update(id: string, user: UserUpdateInput): Promise<User> {
    return await this.prisma.client.user.update({ data: user, where: { id } });
  }

  async UpdateMany(updates: { id: string; data: UserUpdateInput }[]): Promise<User[]> {
    return await this.prisma.client.$transaction(
      updates.map(({ id, data }) => this.prisma.client.user.update({ where: { id }, data })),
    );
  }

  async Delete(id: string): Promise<User> {
    return await this.prisma.client.user.delete({ where: { id } });
  }

  async DeleteMany(filter: UserWhereInput): Promise<User[]> {
    const usersToDelete = await this.prisma.client.user.findMany({ where: filter });
    await this.prisma.client.user.deleteMany({ where: filter });
    return usersToDelete;
  }
}
