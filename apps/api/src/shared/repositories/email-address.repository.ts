import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import {
  EmailAddressCreateInput,
  EmailAddressCreateManyInput,
  EmailAddressGetPayload,
  EmailAddressInclude,
  EmailAddressOrderByWithRelationInput,
  EmailAddressUpdateInput,
  EmailAddressWhereInput,
} from '@repo/db';

@Injectable()
export class EmailAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single email address by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @param include - The relations to include in the result.
   * @returns The found email address or null if not found.
   */
  async findOne<I extends EmailAddressInclude>(
    where: EmailAddressWhereInput,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }> | null> {
    return await this.prisma.client.emailAddress.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Finds multiple email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of email addresses to return. Defaults to 10.
   *   - `skip` (number, optional): The number of email addresses to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (EmailAddressOrderByWithRelationInput, optional): The order in which to sort the email addresses. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found email addresses.
   */
  async findMany<I extends EmailAddressInclude>(
    where: EmailAddressWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: EmailAddressOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    return await this.prisma.client.emailAddress.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.emailAddress.count({ where: { ...where, deletedAt: null } });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new email address.
   * @param data - The data for the email address.
   * @param include - The relations to include in the result.
   * @returns The created email address.
   */
  async create<I extends EmailAddressInclude>(
    data: EmailAddressCreateInput,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>> {
    return await this.prisma.client.emailAddress.create({
      data,
      include: include ?? { user: true },
    });
  }

  /**
   * Creates multiple new email addresses.
   * @param data - The data for the email addresses.
   * @param include - The relations to include in the result.
   * @returns The created email addresses.
   */
  async createMany<I extends EmailAddressInclude>(
    data: EmailAddressCreateManyInput[],
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    return await this.prisma.client.emailAddress.createManyAndReturn({
      data,
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates an email address by the given ID.
   * @param id - The ID of the email address to update.
   * @param data - The data to update the email address with.
   * @param include - The relations to include in the result.
   * @returns The updated email address.
   */
  async update<I extends EmailAddressInclude>(
    id: string,
    data: EmailAddressUpdateInput,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>> {
    return await this.prisma.client.emailAddress.update({
      where: { id },
      data,
      include: include ?? { user: true },
    });
  }

  /**
   * Updates multiple email addresses by the given IDs.
   * @param updates - The updates to apply to the email addresses.
   * @param include - The relations to include in the result.
   * @returns The updated email addresses.
   */
  async updateMany<I extends EmailAddressInclude>(
    updates: { id: string; data: EmailAddressUpdateInput }[],
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.emailAddress.update({
          where: { id },
          data,
          include: include ?? { user: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes an email address by the given ID.
   * @param id - The ID of the email address to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted email address.
   */
  async delete<I extends EmailAddressInclude>(
    id: string,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>> {
    return await this.prisma.client.emailAddress.delete({
      where: { id },
      include: include ?? { user: true },
    });
  }

  /**
   * Deletes multiple email addresses by the given where conditions.
   * @param filter - The where conditions to filter the email addresses by.
   * @param include - The relations to include in the result.
   * @returns The deleted email addresses.
   */
  async deleteMany<I extends EmailAddressInclude>(
    filter: EmailAddressWhereInput,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    const emailAddressesToDelete = await this.prisma.client.emailAddress.findMany({
      where: filter,
      include: include ?? { user: true },
    });
    if (emailAddressesToDelete.length === 0) return [];

    await this.prisma.client.emailAddress.deleteMany({
      where: { id: { in: emailAddressesToDelete.map((emailAddress) => emailAddress.id) } },
    });

    return emailAddressesToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes an email address by the given ID.
   * @param id - The ID of the email address to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted email address.
   */
  async softDelete<I extends EmailAddressInclude>(
    id: string,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>> {
    return await this.prisma.client.emailAddress.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { user: true },
    });
  }

  /**
   * Soft deletes multiple email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @param include - The relations to include in the result.
   * @returns The deleted email addresses.
   */
  async softDeleteMany<I extends EmailAddressInclude>(
    where: EmailAddressWhereInput,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    const emailAddressesToDelete = await this.prisma.client.emailAddress.findMany({
      where,
      include: include ?? { user: true },
    });
    if (emailAddressesToDelete.length === 0) return [];

    const emailAddressIds = emailAddressesToDelete.map((emailAddress) => emailAddress.id);
    await this.prisma.client.emailAddress.updateMany({
      where: { id: { in: emailAddressIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.emailAddress.findMany({
      where: { id: { in: emailAddressIds } },
      include: include ?? { user: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted email address by the given ID.
   * @param id - The ID of the email address to restore.
   * @param include - The relations to include in the result.
   * @returns The restored email address.
   */
  async restore<I extends EmailAddressInclude>(
    id: string,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>> {
    return await this.prisma.client.emailAddress.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { user: true },
    });
  }

  /**
   * Restores multiple soft deleted email addresses by the given where conditions.
   * @param where - The where conditions to filter the email addresses by.
   * @param include - The relations to include in the result.
   * @returns The restored email addresses.
   */
  async restoreMany<I extends EmailAddressInclude>(
    where: EmailAddressWhereInput,
    include?: I,
  ): Promise<EmailAddressGetPayload<{ include: I }>[]> {
    const emailAddressesToRestore = await this.prisma.client.emailAddress.findMany({
      where,
      include: include ?? { user: true },
    });
    if (emailAddressesToRestore.length === 0) return [];

    const emailAddressIds = emailAddressesToRestore.map((emailAddress) => emailAddress.id);
    await this.prisma.client.emailAddress.updateMany({
      where: { id: { in: emailAddressIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.emailAddress.findMany({
      where: { id: { in: emailAddressIds } },
      include: include ?? { user: true },
    });
  }
}
