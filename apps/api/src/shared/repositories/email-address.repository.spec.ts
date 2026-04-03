import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus, EmailType, PrismaClient } from '@repo/db';
import { emailAddressBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { EmailAddressRepository } from './email-address.repository';

describe('EmailAddressRepository', () => {
  let repository: EmailAddressRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockEmail = emailAddressBuilder({
    id: 'email-id-123',
    email: 'test@example.com',
    userId: 'user-id-123',
    type: EmailType.primary,
    status: EmailStatus.pending,
    verifiedAt: null,
    deletedAt: null,
  });

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAddressRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<EmailAddressRepository>(EmailAddressRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('QUERIES', () => {
    it('getById should return email address', async () => {
      mockTx.emailAddress.findUnique.mockResolvedValue(mockEmail);
      const result = await repository.getById('email-id-123');
      expect(result).toEqual(mockEmail);
    });

    it('getByEmail should return email address', async () => {
      mockTx.emailAddress.findFirst.mockResolvedValue(mockEmail);
      const result = await repository.getByEmail('test@example.com');
      expect(result).toEqual(mockEmail);
    });

    it('getAllByUserId should return all emails for user', async () => {
      mockTx.emailAddress.findMany.mockResolvedValue([mockEmail]);
      const result = await repository.getAllByUserId('user-id-123');
      expect(result).toEqual([mockEmail]);
    });

    it('getPrimaryByUserId should return primary email', async () => {
      mockTx.emailAddress.findFirst.mockResolvedValue(mockEmail);
      const result = await repository.getPrimaryByUserId('user-id-123');
      expect(result).toEqual(mockEmail);
      expect(mockTx.emailAddress.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', type: EmailType.primary },
      });
    });

    it('getRecoveryByUserId should return recovery emails', async () => {
      mockTx.emailAddress.findMany.mockResolvedValue([mockEmail]);
      const result = await repository.getRecoveryByUserId('user-id-123');
      expect(result).toEqual([mockEmail]);
      expect(mockTx.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', type: EmailType.recovery },
      });
    });

    it('getByTypeAndUserId should return emails of specific type', async () => {
      mockTx.emailAddress.findMany.mockResolvedValue([mockEmail]);
      const result = await repository.getByTypeAndUserId(EmailType.primary, 'user-id-123');
      expect(result).toEqual([mockEmail]);
      expect(mockTx.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', type: EmailType.primary },
      });
    });

    it('getByStatusAndUserId should return emails of specific status', async () => {
      mockTx.emailAddress.findMany.mockResolvedValue([mockEmail]);
      const result = await repository.getByStatusAndUserId(EmailStatus.verified, 'user-id-123');
      expect(result).toEqual([mockEmail]);
      expect(mockTx.emailAddress.findMany).toHaveBeenCalledWith({
        where: { status: EmailStatus.verified, userId: 'user-id-123' },
      });
    });

    it('getVerifiedByUserId should return verified emails', async () => {
      mockTx.emailAddress.findMany.mockResolvedValue([mockEmail]);
      const result = await repository.getVerifiedByUserId('user-id-123');
      expect(result).toEqual([mockEmail]);
      expect(mockTx.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', status: EmailStatus.verified },
      });
    });
  });

  describe('EXISTS & COUNT', () => {
    it('exists should return true if exists', async () => {
      mockTx.emailAddress.count.mockResolvedValue(1);
      const result = await repository.exists('email-id-123');
      expect(result).toBe(true);
      expect(mockTx.emailAddress.count).toHaveBeenCalledWith({ where: { id: 'email-id-123' } });
    });

    it('existsByEmail should return true if exists', async () => {
      mockTx.emailAddress.count.mockResolvedValue(1);
      const result = await repository.existsByEmail('test@example.com');
      expect(result).toBe(true);
    });

    it('existsByUserId should return true if exists', async () => {
      mockTx.emailAddress.count.mockResolvedValue(1);
      const result = await repository.existsByUserId('user-id-123');
      expect(result).toBe(true);
      expect(mockTx.emailAddress.count).toHaveBeenCalledWith({ where: { userId: 'user-id-123' } });
    });

    it('count should return number of emails matching filter', async () => {
      mockTx.emailAddress.count.mockResolvedValue(5);
      const result = await repository.count({ type: EmailType.primary });
      expect(result).toBe(5);
      expect(mockTx.emailAddress.count).toHaveBeenCalledWith({
        where: { type: EmailType.primary },
      });
    });

    it('countPerUserId should return number of emails', async () => {
      mockTx.emailAddress.count.mockResolvedValue(2);
      const result = await repository.countPerUserId('user-id-123');
      expect(result).toBe(2);
    });
  });

  describe('CREATE', () => {
    it('should create an email address', async () => {
      mockTx.emailAddress.create.mockResolvedValue(mockEmail);
      const payload = { email: 'new@example.com', userId: 'user-123', type: EmailType.primary };
      const result = await repository.create(payload as any);
      expect(result).toEqual(mockEmail);
      expect(mockTx.emailAddress.create).toHaveBeenCalledWith({ data: payload });
    });
  });

  describe('UPDATE', () => {
    it('edit should update email', async () => {
      mockTx.emailAddress.update.mockResolvedValue(mockEmail);
      const result = await repository.edit('id', { status: EmailStatus.verified });
      expect(result).toEqual(mockEmail);
    });

    it('updateMany should update multiple emails in transaction', async () => {
      const updates = [
        { id: '1', data: { status: EmailStatus.verified } },
        { id: '2', data: { status: EmailStatus.verified } },
      ];
      mockTx.$transaction.mockResolvedValue([mockEmail, mockEmail]);

      const result = await repository.updateMany(updates);

      expect(result).toEqual([mockEmail, mockEmail]);
      expect(mockTx.$transaction).toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('delete should remove email', async () => {
      mockTx.emailAddress.delete.mockResolvedValue(mockEmail);
      const result = await repository.delete('id');
      expect(result).toEqual(mockEmail);
    });

    it('deleteMany should remove emails matching filter', async () => {
      mockTx.emailAddress.findMany.mockResolvedValue([mockEmail]);
      mockTx.emailAddress.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await repository.deleteMany({ userId: 'user-123' });
      expect(result).toEqual([mockEmail]);
      expect(mockTx.emailAddress.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
