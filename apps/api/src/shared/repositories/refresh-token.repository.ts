import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { RefreshToken, RefreshTokenCreateInput, RefreshTokenUpdateInput } from '@repo/db';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.client.refreshToken.findUnique({
      where: { token },
      include: { session: true },
    });
  }

  async create(data: RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.create({ data });
  }

  async update(token: string, data: RefreshTokenUpdateInput): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.update({
      where: { token },
      data,
    });
  }

  async revoke(token: string): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.client.refreshToken.delete({ where: { token } });
  }
}
