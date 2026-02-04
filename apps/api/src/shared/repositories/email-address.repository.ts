import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  EmailAddress,
  EmailAddressCreateInput,
  EmailAddressUpdateInput,
  EmailAddressWhereInput,
  EmailStatus,
  EmailType,
} from '@repo/db';

@Injectable()
export class EmailAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<EmailAddress | null> {
    return await this.prisma.client.emailAddress.findUnique({ where: { id } });
  }

  async getByEmail(email: string): Promise<EmailAddress | null> {
    return await this.prisma.client.emailAddress.findFirst({ where: { email } });
  }

  async getAllByUserId(userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({ where: { userId } });
  }

  async getPrimaryByUserId(userId: string): Promise<EmailAddress | null> {
    return await this.prisma.client.emailAddress.findFirst({
      where: { userId, type: EmailType.primary },
    });
  }

  async getRecoveryByUserId(userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, type: EmailType.recovery },
    });
  }

  async getByTypeAndUserId(type: EmailType, userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, type },
    });
  }

  async getByStatusAndUserId(status: EmailStatus, userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({ where: { status, userId } });
  }

  async getVerifiedByUserId(userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, status: EmailStatus.verified },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({ where: { id } });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({ where: { email } });
    return count > 0;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({ where: { userId } });
    return count > 0;
  }

  async count(filter: EmailAddressWhereInput): Promise<number> {
    return await this.prisma.client.emailAddress.count({ where: filter });
  }

  async countPerUserId(userId: string): Promise<number> {
    return await this.prisma.client.emailAddress.count({ where: { userId } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(payload: EmailAddressCreateInput): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.create({ data: payload });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async edit(id: string, payload: EmailAddressUpdateInput): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.update({ where: { id }, data: payload });
  }

  async updateMany(
    updates: { id: string; data: EmailAddressUpdateInput }[],
  ): Promise<EmailAddress[]> {
    return await this.prisma.client.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.emailAddress.update({ where: { id }, data }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.delete({ where: { id } });
  }

  async deleteMany(filter: EmailAddressWhereInput): Promise<EmailAddress[]> {
    const emailAddressesToDelete = await this.prisma.client.emailAddress.findMany({
      where: filter,
    });
    await this.prisma.client.emailAddress.deleteMany({ where: filter });
    return emailAddressesToDelete;
  }
}
