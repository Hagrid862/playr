import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { audioFileBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioFileRepository } from './audio-file.repository';
import { PrismaService } from '../services/prisma.service';

describe('AudioFileRepository', () => {
  let repository: AudioFileRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioFileRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(AudioFileRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('findOne and findOneWithInclude pass expected args', async () => {
    await setup();
    mockTx.audioFile.findFirst.mockResolvedValue({ id: 'f1' } as any);
    await repository.findOne({ id: 'f1' });
    expect(mockTx.audioFile.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'f1' },
    });

    await repository.findOneWithInclude({ id: 'f1' }, {
      track: { include: { album: true } },
    } as any);
    expect(mockTx.audioFile.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'f1' },
      include: { track: { include: { album: true } } },
    });
  });

  it('findMany and findManyWithInclude support defaults and overrides', async () => {
    await setup();
    mockTx.audioFile.findMany.mockResolvedValue([]);

    await repository.findMany({ trackId: 't1' }, {});
    expect(mockTx.audioFile.findMany).toHaveBeenNthCalledWith(1, {
      where: { trackId: 't1' },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
    });

    await repository.findManyWithInclude({ trackId: 't1' }, { track: true }, {});
    expect(mockTx.audioFile.findMany).toHaveBeenNthCalledWith(2, {
      where: { trackId: 't1' },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { track: true },
    });

    await repository.findManyWithInclude(
      { trackId: 't1' },
      { track: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );
    expect(mockTx.audioFile.findMany).toHaveBeenNthCalledWith(3, {
      where: { trackId: 't1' },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { track: true },
    });
  });

  it('exists and count map to count query', async () => {
    await setup();
    mockTx.audioFile.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5);
    await expect(repository.exists({ id: 'f1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'f1' })).resolves.toBe(true);
    await expect(repository.count({ trackId: 't1' })).resolves.toBe(5);
  });

  it('create/createMany/update/updateMany/delete pass payloads', async () => {
    await setup();
    const row = audioFileBuilder({ id: 'f1' });
    mockTx.audioFile.create.mockResolvedValue(row);
    mockTx.audioFile.createManyAndReturn.mockResolvedValue([row]);
    mockTx.audioFile.update.mockResolvedValue(row);
    mockTx.audioFile.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);

    await repository.create({ key: 'k1' } as any);
    await repository.createMany([{ key: 'k1' } as any]);
    await repository.update('f1', { key: 'k2' } as any);
    await repository.updateMany([{ id: 'f1', data: { key: 'k3' } as any }]);
    await repository.delete('f1');

    expect(mockTx.audioFile.create).toHaveBeenCalledWith({ data: { key: 'k1' } });
    expect(mockTx.audioFile.createManyAndReturn).toHaveBeenCalledWith({ data: [{ key: 'k1' }] });
    expect(mockTx.audioFile.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { key: 'k2' },
    });
    expect(mockTx.audioFile.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
  });

  it('deleteMany returns [] when no rows', async () => {
    await setup();
    mockTx.audioFile.findMany.mockResolvedValue([]);
    const result = await repository.deleteMany({ trackId: 't1' });
    expect(result).toEqual([]);
    expect(mockTx.audioFile.deleteMany).not.toHaveBeenCalled();
  });

  it('deleteMany deletes found rows and returns them', async () => {
    await setup();
    const rows = [audioFileBuilder({ id: 'f1' }), audioFileBuilder({ id: 'f2' })];
    mockTx.audioFile.findMany.mockResolvedValue(rows);
    const result = await repository.deleteMany({} as any);
    expect(result).toEqual(rows);
    expect(mockTx.audioFile.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['f1', 'f2'] } },
    });
  });
});
