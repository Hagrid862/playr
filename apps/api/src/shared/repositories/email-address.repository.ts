import { Injectable } from '@nestjs/common';
import {
  EmailAddress,
  EmailAddressCreateInput,
  EmailAddressCreateManyInput,
  EmailAddressGetPayload,
  EmailAddressInclude,
  EmailAddressOrderByWithRelationInput,
  EmailAddressUpdateInput,
  EmailAddressWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class EmailAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single email address by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @returns The found email address or null if not found.
   */
  async findOne(
    where: EmailAddressWhereInput,
  ): Promise<EmailAddressGetPayload<{ include: { user: true } }> | null> {
    return this.prisma.client.emailAddress.findFirst({
      where: { ...where, deletedAt: null },
      include: { user: true },
    });
  }

  /**
   * Finds a single email address by the given where conditions with relations.
   * @param where - The where conditions to filter the email addresses by.
   * @param include - The relations to include in the result.
   * @returns The found email address with relations or null if not found.
   */
  async findOneWithInclude<I extends EmailAddressInclude>(
    where: EmailAddressWhereInput,
    include: I,
  ): Promise<EmailAddressGetPayload<{ include: I }> | null> {
    return this.prisma.client.emailAddress.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of email addresses to return. Defaults to 10.
   *   - `skip` (number, optional): The number of email addresses to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (EmailAddressOrderByWithRelationInput, optional): The order in which to sort the email addresses. Defaults to descending by `createdAt`.
   * @returns The found email addresses.
   */
  async findMany(
    where: EmailAddressWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: EmailAddressOrderByWithRelationInput | EmailAddressOrderByWithRelationInput[];
    },
  ): Promise<EmailAddressGetPayload<{ include: { user: true } }>[]> {
    return this.prisma.client.emailAddress.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { user: true },
    });
  }

  /**
   * Finds multiple email addresses by the given where conditions with relations.
   * @param where - The where conditions to filter the email addresses by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of email addresses to return. Defaults to 10.
   *   - `skip` (number, optional): The number of email addresses to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (EmailAddressOrderByWithRelationInput or array of it, optional): The order in which to sort the email addresses. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found email addresses with relations.
   */
  async findManyWithInclude<I extends EmailAddressInclude>(
    where: EmailAddressWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: EmailAddressOrderByWithRelationInput | EmailAddressOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    return this.prisma.client.emailAddress.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if an email address exists by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @returns True if the email address exists, false otherwise.
   */
  async exists(where: EmailAddressWhereInput): Promise<boolean> {
    const count = await this.prisma.client.emailAddress.count({
      where: { ...where, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Counts the number of email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @returns The number of email addresses.
   */
  async count(where?: EmailAddressWhereInput): Promise<number> {
    return this.prisma.client.emailAddress.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Creates a new email address.
   * @param data - The data for the email address.
   * @returns The created email address.
   */
  async create(data: EmailAddressCreateInput): Promise<EmailAddress> {
    return this.prisma.client.emailAddress.create({
      data,
    });
  }

  /**
   * Creates multiple new email addresses.
   * @param data - The data for the email addresses.
   * @returns The created email addresses.
   */
  async createMany(data: EmailAddressCreateManyInput[]): Promise<EmailAddress[]> {
    return this.prisma.client.emailAddress.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates an email address by the given ID.
   * @param id - The ID of the email address to update.
   * @param data - The data to update the email address with.
   * @returns The updated email address.
   */
  async update(id: string, data: EmailAddressUpdateInput): Promise<EmailAddress> {
    return this.prisma.client.emailAddress.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple email addresses by the given IDs.
   * @param updates - The updates to apply to the email addresses.
   * @returns The updated email addresses.
   */
  async updateMany(
    updates: { id: string; data: EmailAddressUpdateInput }[],
  ): Promise<EmailAddress[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.emailAddress.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes an email address by the given ID.
   * @param id - The ID of the email address to delete.
   * @returns The deleted email address.
   */
  async delete(id: string): Promise<EmailAddress> {
    return this.prisma.client.emailAddress.delete({
      where: { id },
    });
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the email address from the database without checking or respecting the deletedAt field.
   * Deletes multiple email addresses by the given where conditions.
   * @param filter - The where conditions to filter the email addresses by.
   * @returns The deleted email addresses.
   */
  async deleteMany(filter: EmailAddressWhereInput): Promise<EmailAddress[]> {
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.emailAddress.findMany({
        where: filter,
      });

      if (toDelete.length === 0) return [];

      await tx.emailAddress.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } },
      });

      return toDelete;
    });
  }

  /**
   * WARNING: This method marks the email address as deleted by setting the `deletedAt` field to the current date/time.
   * Soft deletes an email address by the given ID.
   * @param id - The ID of the email address to soft delete.
   * @returns The deleted email address.
   */
  async softDelete(id: string): Promise<EmailAddress> {
    return this.prisma.client.emailAddress.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @returns The deleted email addresses.
   */
  async softDeleteMany(where: EmailAddressWhereInput): Promise<EmailAddress[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const rows = await tx.emailAddress.findMany({
        where: { ...where, deletedAt: null },
      });
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.emailAddress.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt },
      });

      return tx.emailAddress.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Restores a soft deleted email address by the given ID.
   * @param id - The ID of the email address to restore.
   * @returns The restored email address.
   */
  async restore(id: string): Promise<EmailAddress> {
    return this.prisma.client.emailAddress.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @returns The restored email addresses.
   */
  async restoreMany(where: EmailAddressWhereInput): Promise<EmailAddress[]> {
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toRestore = await tx.emailAddress.findMany({
        where: { ...where, deletedAt: { not: null } },
      });
      if (toRestore.length === 0) return [];

      const ids = toRestore.map((row) => row.id);
      await tx.emailAddress.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null },
      });

      return toRestore.map((row) => ({ ...row, deletedAt: null }));
    });
  }
}
