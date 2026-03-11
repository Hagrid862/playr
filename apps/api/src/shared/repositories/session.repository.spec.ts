import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, Session, SessionType } from '@repo/db';
import { PrismaService } from '../services/prisma.service';
import { SessionRepository } from './session.repository';
import { buildSession } from '@repo/testing';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockSession: Session = buildSession({
    id: 'session-id-123',
    userId: 'user-id-123',
    type: SessionType.user,
  });

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<SessionRepository>(SessionRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('QUERIES', () => {
    it('getById should return session', async () => {
      mockTx.session.findUnique.mockResolvedValue(mockSession);
      const result = await repository.getById('session-id-123');
      expect(result).toEqual(mockSession);
    });

    it('getActiveByUserId should return valid sessions', async () => {
      mockTx.session.findMany.mockResolvedValue([mockSession]);
      const result = await repository.getActiveByUserId('user-id-123');
      expect(result).toEqual([mockSession]);
      expect(mockTx.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id-123',
            revokedAt: null,
          }),
        }),
      );
    });

    it('countActiveByUserId should return number of active sessions', async () => {
      mockTx.session.count.mockResolvedValue(3);
      const result = await repository.countActiveByUserId('user-id-123');
      expect(result).toBe(3);
      expect(mockTx.session.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id-123',
            revokedAt: null,
          }),
        }),
      );
    });
  });

  describe('CREATE', () => {
    it('should create new session', async () => {
      mockTx.session.create.mockResolvedValue(mockSession);
      const data = {
        user: { connect: { id: 'user-123' } },
      };
      const result = await repository.create(data);
      expect(result).toEqual(mockSession);
      expect(mockTx.session.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('UPDATE', () => {
    it('update should modify session data', async () => {
      mockTx.session.update.mockResolvedValue(mockSession);
      const data = { revokedAt: new Date() };
      const result = await repository.update('session-id-123', data);
      expect(result).toEqual(mockSession);
      expect(mockTx.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id-123' },
        data,
      });
    });
  });

  describe('REVOKE / DELETE', () => {
    it('revoke should mark session as revoked', async () => {
      mockTx.session.update.mockResolvedValue({ ...mockSession, revokedAt: new Date() });
      const result = await repository.revoke('session-id-123');
      expect(result.revokedAt).toBeDefined();
    });

    it('revokeAllByUserId should revoke multiple sessions', async () => {
      mockTx.session.updateMany.mockResolvedValue({ count: 5 });
      await repository.revokeAllByUserId('user-id-123');
      expect(mockTx.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('deleteExpired should remove records', async () => {
      mockTx.session.deleteMany.mockResolvedValue({ count: 10 });
      const result = await repository.deleteExpired();
      expect(result).toBe(10);
      expect(mockTx.session.deleteMany).toHaveBeenCalled();
    });
  });
});
