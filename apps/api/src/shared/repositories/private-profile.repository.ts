import { Injectable } from '@nestjs/common';
import {
  UserPrivateProfile,
  UserPrivateProfileCreateInput,
  UserPrivateProfileCreateManyInput,
  UserPrivateProfileOrderByWithRelationInput,
  UserPrivateProfileUpdateInput,
  UserPrivateProfileWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrivateProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<UserPrivateProfile | null> {
    return await this.prisma.client.userPrivateProfile.findUnique({ where: { id } });
  }

  async getByUserId(userId: string): Promise<UserPrivateProfile | null> {
    return await this.prisma.client.userPrivateProfile.findUnique({ where: { userId } });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: UserPrivateProfileWhereInput,
    orderBy?: UserPrivateProfileOrderByWithRelationInput,
  ): Promise<UserPrivateProfile[]> {
    return await this.prisma.client.userPrivateProfile.findMany({
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
    const count = await this.prisma.client.userPrivateProfile.count({ where: { id } });
    return count > 0;
  }

  async count(filter?: UserPrivateProfileWhereInput): Promise<number> {
    return await this.prisma.client.userPrivateProfile.count({ where: filter });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: UserPrivateProfileCreateInput): Promise<UserPrivateProfile> {
    return await this.prisma.client.userPrivateProfile.create({ data });
  }

  async createMany(data: UserPrivateProfileCreateManyInput[]): Promise<UserPrivateProfile[]> {
    return await this.prisma.client.userPrivateProfile.createManyAndReturn({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: UserPrivateProfileUpdateInput): Promise<UserPrivateProfile> {
    return await this.prisma.client.userPrivateProfile.update({ where: { id }, data });
  }

  async updateMany(
    updates: { id: string; data: UserPrivateProfileUpdateInput }[],
  ): Promise<UserPrivateProfile[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.userPrivateProfile.update({ where: { id }, data }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<UserPrivateProfile> {
    return await this.prisma.client.userPrivateProfile.delete({ where: { id } });
  }

  async deleteMany(filter: UserPrivateProfileWhereInput): Promise<UserPrivateProfile[]> {
    const profilesToDelete = await this.prisma.client.userPrivateProfile.findMany({
      where: filter,
    });
    await this.prisma.client.userPrivateProfile.deleteMany({ where: filter });
    return profilesToDelete;
  }
}
