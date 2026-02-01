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

  async GetById(id: string): Promise<EmailAddress | null> {
    return await this.prisma.client.emailAddress.findUnique({ where: { id } });
  }

  async GetByEmail(email: string): Promise<EmailAddress | null> {
    return await this.prisma.client.emailAddress.findFirst({ where: { email } });
  }

  async GetAllByUserId(userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({ where: { userId } });
  }

  async GetPrimaryByUserId(userId: string): Promise<EmailAddress | null> {
    return await this.prisma.client.emailAddress.findFirst({
      where: { userId, type: EmailType.primary },
    });
  }

  async GetRecoveryByUserId(userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, type: EmailType.recovery },
    });
  }

  async GetByTypeAndUserId(type: EmailType, userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, type },
    });
  }

  async GetByStatusAndUserId(status: EmailStatus, userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({ where: { status, userId } });
  }

  async GetVerifiedByUserId(userId: string): Promise<EmailAddress[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { userId, status: EmailStatus.verified },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async Exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({ where: { id } });
    return count > 0;
  }

  async ExistsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({ where: { email } });
    return count > 0;
  }

  async ExistsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({ where: { userId } });
    return count > 0;
  }

  async Count(filter: EmailAddressWhereInput): Promise<number> {
    return await this.prisma.client.emailAddress.count({ where: filter });
  }

  async CountPerUserId(userId: string): Promise<number> {
    return await this.prisma.client.emailAddress.count({ where: { userId } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async Create(payload: EmailAddressCreateInput): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.create({ data: payload });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async Edit(id: string, payload: EmailAddressUpdateInput): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.update({ where: { id }, data: payload });
  }

  async UpdateMany(
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

  async Delete(id: string): Promise<EmailAddress> {
    return await this.prisma.client.emailAddress.delete({ where: { id } });
  }

  async DeleteMany(filter: EmailAddressWhereInput): Promise<EmailAddress[]> {
    const emailAddressesToDelete = await this.prisma.client.emailAddress.findMany({
      where: filter,
    });
    await this.prisma.client.emailAddress.deleteMany({ where: filter });
    return emailAddressesToDelete;
  }
}
