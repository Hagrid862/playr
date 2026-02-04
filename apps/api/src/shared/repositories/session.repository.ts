import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { Session, SessionCreateInput, SessionUpdateInput } from '@repo/db';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Session | null> {
    return this.prisma.client.session.findUnique({
      where: { id },
    });
  }

  async getActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.client.session.findMany({
      where: {
        userId,
        revokedAt: null,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.prisma.client.session.count({
      where: {
        userId,
        revokedAt: null,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: SessionCreateInput): Promise<Session> {
    return this.prisma.client.session.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: SessionUpdateInput): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id },
      data,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // REVOKE / DELETE
  // ─────────────────────────────────────────────────────────────

  async revoke(id: string): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.client.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    return result.count;
  }
}
