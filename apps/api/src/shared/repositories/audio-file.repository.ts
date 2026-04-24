import { Injectable } from '@nestjs/common';
import {
  AudioFile,
  AudioFileCreateInput,
  AudioFileCreateManyInput,
  AudioFileGetPayload,
  AudioFileInclude,
  AudioFileOrderByWithRelationInput,
  AudioFileUpdateInput,
  AudioFileWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class AudioFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single audio file by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @returns The found audio file or null if not found.
   */
  async findOne(
    where: AudioFileWhereInput,
  ): Promise<AudioFileGetPayload<{ include: { track: true } }> | null> {
    return this.prisma.client.audioFile.findFirst({
      where,
      include: { track: true },
    });
  }

  /**
   * Finds a single audio file by the given where conditions with relations.
   * @param where - The where conditions to filter the audio files by.
   * @param include - The relations to include in the result.
   * @returns The found audio file with relations or null if not found.
   */
  async findOneWithInclude<I extends AudioFileInclude>(
    where: AudioFileWhereInput,
    include: I,
  ): Promise<AudioFileGetPayload<{ include: I }> | null> {
    return this.prisma.client.audioFile.findFirst({
      where,
      include: include,
    });
  }

  /**
   * Finds multiple audio files by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of audio files to return. Defaults to 10.
   *   - `skip` (number, optional): The number of audio files to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (AudioFileOrderByWithRelationInput or array of it, optional): The order in which to sort the audio files. Defaults to descending by `createdAt`.
   * @returns The found audio files.
   */
  async findMany(
    where: AudioFileWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: AudioFileOrderByWithRelationInput | AudioFileOrderByWithRelationInput[];
    },
  ): Promise<AudioFileGetPayload<{ include: { track: true } }>[]> {
    return this.prisma.client.audioFile.findMany({
      where,
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: { track: true },
    });
  }

  /**
   * Finds multiple audio files by the given where conditions with relations.
   * @param where - The where conditions to filter the audio files by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of audio files to return. Defaults to 10.
   *   - `skip` (number, optional): The number of audio files to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (AudioFileOrderByWithRelationInput or array of it, optional): The order in which to sort the audio files. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found audio files with relations.
   */
  async findManyWithInclude<I extends AudioFileInclude>(
    where: AudioFileWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: AudioFileOrderByWithRelationInput | AudioFileOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    return this.prisma.client.audioFile.findMany({
      where,
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if an audio file exists by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @returns True if the audio file exists, false otherwise.
   */
  async exists(where: AudioFileWhereInput): Promise<boolean> {
    const count = await this.prisma.client.audioFile.count({
      where,
    });
    return count > 0;
  }

  /**
   * Counts the number of audio files by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @returns The number of audio files.
   */
  async count(where?: AudioFileWhereInput): Promise<number> {
    return this.prisma.client.audioFile.count({ where });
  }

  /**
   * Creates a new audio file.
   * @param data - The data for the audio file.
   * @returns The created audio file.
   */
  async create(data: AudioFileCreateInput): Promise<AudioFile> {
    return this.prisma.client.audioFile.create({
      data,
    });
  }

  /**
   * Creates multiple new audio files.
   * @param data - The data for the audio files.
   * @returns The created audio files.
   */
  async createMany(data: AudioFileCreateManyInput[]): Promise<AudioFile[]> {
    return this.prisma.client.audioFile.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates an audio file by the given ID.
   * @param id - The ID of the audio file to update.
   * @param data - The data to update the audio file with.
   * @returns The updated audio file.
   */
  async update(id: string, data: AudioFileUpdateInput): Promise<AudioFile> {
    return this.prisma.client.audioFile.update({
      where: { id },
      data,
    });
  }

  /**
   * Updates multiple audio files by the given IDs.
   * @param updates - The updates to apply to the audio files.
   * @returns The updated audio files.
   */
  async updateMany(updates: { id: string; data: AudioFileUpdateInput }[]): Promise<AudioFile[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.audioFile.update({
          where: { id },
          data,
        }),
      ),
    );
  }

  /**
   * Deletes an audio file by the given ID.
   * @param id - The ID of the audio file to delete.
   * @returns The deleted audio file.
   */
  async delete(id: string): Promise<AudioFile> {
    return this.prisma.client.audioFile.delete({
      where: { id },
    });
  }

  /**
   * Deletes multiple audio files by the given where conditions.
   * @param filter - The where conditions to filter the audio files by.
   * @returns The deleted audio files.
   */
  async deleteMany(filter: AudioFileWhereInput): Promise<AudioFile[]> {
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.audioFile.findMany({
        where: filter,
      });

      if (toDelete.length === 0) return [];

      await tx.audioFile.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } },
      });

      return toDelete;
    });
  }
}
