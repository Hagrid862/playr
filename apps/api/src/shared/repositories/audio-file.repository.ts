import { Injectable } from '@nestjs/common';
import {
  AudioFile,
  AudioFileCreateInput,
  AudioFileOrderByWithRelationInput,
  AudioFileUpdateInput,
  AudioFileWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class AudioFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: AudioFileWhereInput, includeRelations = false): Promise<AudioFile | null> {
    return await this.prisma.client.audioFile.findFirst({
      where,
      include: includeRelations ? { track: true } : undefined,
    });
  }

  async findMany(options: {
    where?: AudioFileWhereInput;
    take?: number;
    skip?: number;
    orderBy?: AudioFileOrderByWithRelationInput;
  }): Promise<AudioFile[]> {
    return await this.prisma.client.audioFile.findMany({
      take: options.take,
      skip: options.skip,
      where: options.where,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(where: AudioFileWhereInput): Promise<boolean> {
    const count = await this.prisma.client.audioFile.count({ where });
    return count > 0;
  }

  async count(filter?: AudioFileWhereInput): Promise<number> {
    return await this.prisma.client.audioFile.count({
      where: filter,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: AudioFileCreateInput): Promise<AudioFile> {
    return await this.prisma.client.audioFile.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: AudioFileUpdateInput): Promise<AudioFile> {
    return await this.prisma.client.audioFile.update({ where: { id }, data });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<AudioFile> {
    return await this.prisma.client.audioFile.delete({ where: { id } });
  }
}
