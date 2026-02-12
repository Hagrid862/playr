import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, UserPrivateProfile } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { PrivateProfileRepository } from './private-profile.repository';

describe('PrivateProfileRepository', () => {
  let repository: PrivateProfileRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockProfile: UserPrivateProfile = {
    id: 'pp-123',
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivateProfileRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<PrivateProfileRepository>(PrivateProfileRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should return profile by id', async () => {
      mockTx.userPrivateProfile.findUnique.mockResolvedValue(mockProfile);
      const result = await repository.getById('pp-123');
      expect(result).toEqual(mockProfile);
      expect(mockTx.userPrivateProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'pp-123' },
      });
    });
  });

  describe('getByUserId', () => {
    it('should return profile by user id', async () => {
      mockTx.userPrivateProfile.findUnique.mockResolvedValue(mockProfile);
      const result = await repository.getByUserId('user-123');
      expect(result).toEqual(mockProfile);
      expect(mockTx.userPrivateProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated profiles', async () => {
      mockTx.userPrivateProfile.findMany.mockResolvedValue([mockProfile]);
      const result = await repository.getPaginated(1, 10);
      expect(result).toEqual([mockProfile]);
      expect(mockTx.userPrivateProfile.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: undefined,
        orderBy: undefined,
      });
    });
  });

  describe('exists', () => {
    it('should return true if profile exists', async () => {
      mockTx.userPrivateProfile.count.mockResolvedValue(1);
      const result = await repository.exists('pp-123');
      expect(result).toBe(true);
      expect(mockTx.userPrivateProfile.count).toHaveBeenCalledWith({ where: { id: 'pp-123' } });
    });

    it('should return false if profile does not exist', async () => {
      mockTx.userPrivateProfile.count.mockResolvedValue(0);
      const result = await repository.exists('pp-123');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of profiles', async () => {
      mockTx.userPrivateProfile.count.mockResolvedValue(5);
      const result = await repository.count();
      expect(result).toBe(5);
      expect(mockTx.userPrivateProfile.count).toHaveBeenCalledWith({ where: undefined });
    });
  });

  describe('create', () => {
    it('should create a profile', async () => {
      mockTx.userPrivateProfile.create.mockResolvedValue(mockProfile);
      const data = { user: { connect: { id: 'user-123' } } };
      const result = await repository.create(data);
      expect(result).toEqual(mockProfile);
      expect(mockTx.userPrivateProfile.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('createMany', () => {
    it('should create many profiles', async () => {
      mockTx.userPrivateProfile.createManyAndReturn.mockResolvedValue([mockProfile]);
      const data = [{ userId: 'user-123' }];
      const result = await repository.createMany(data);
      expect(result).toEqual([mockProfile]);
      expect(mockTx.userPrivateProfile.createManyAndReturn).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      mockTx.userPrivateProfile.update.mockResolvedValue(mockProfile);
      const data = { updatedAt: new Date() };
      const result = await repository.update('pp-123', data);
      expect(result).toEqual(mockProfile);
      expect(mockTx.userPrivateProfile.update).toHaveBeenCalledWith({
        where: { id: 'pp-123' },
        data,
      });
    });
  });

  describe('updateMany', () => {
    it('should update many profiles in transaction', async () => {
      mockTx.$transaction.mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
          // If it's an array of promises (which likely isn't what prisma.$transaction takes directly,
          // but for this specific repository method it maps updates to promises)
          // Wait, the repository implementation passes an array of promises to $transaction
          // "updates.map(...)". So we should mock $transaction to resolve the array of results?
          // The repository usage is `this.prisma.mainClient.$transaction(updates.map(...))`.
          // So $transaction receives an array of Promises.
          return Promise.all(callback);
        }
        return callback;
      });

      mockTx.userPrivateProfile.update.mockResolvedValue(mockProfile);

      const updates = [{ id: 'pp-123', data: { updatedAt: new Date() } }];
      const result = await repository.updateMany(updates);

      expect(result).toEqual([mockProfile]);
      expect(mockTx.$transaction).toHaveBeenCalled();
      expect(mockTx.userPrivateProfile.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should delete a profile', async () => {
      mockTx.userPrivateProfile.delete.mockResolvedValue(mockProfile);
      const result = await repository.delete('pp-123');
      expect(result).toEqual(mockProfile);
      expect(mockTx.userPrivateProfile.delete).toHaveBeenCalledWith({ where: { id: 'pp-123' } });
    });
  });

  describe('deleteMany', () => {
    it('should delete many profiles and return them', async () => {
      mockTx.userPrivateProfile.findMany.mockResolvedValue([mockProfile]);
      mockTx.userPrivateProfile.deleteMany.mockResolvedValue({ count: 1 });

      const filter = { userId: 'user-123' };
      const result = await repository.deleteMany(filter);

      expect(result).toEqual([mockProfile]);
      expect(mockTx.userPrivateProfile.findMany).toHaveBeenCalledWith({ where: filter });
      expect(mockTx.userPrivateProfile.deleteMany).toHaveBeenCalledWith({ where: filter });
    });
  });
});
