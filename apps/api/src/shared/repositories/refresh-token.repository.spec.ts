import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, RefreshToken } from '@repo/db';
import { PrismaService } from '../services/prisma.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { buildRefreshToken } from '@repo/testing';

describe('RefreshTokenRepository', () => {
  let repository: RefreshTokenRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockToken: RefreshToken = buildRefreshToken({
    id: 'rt-id-123',
    token: 'token-string',
    sessionId: 'session-id-123',
  });

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<RefreshTokenRepository>(RefreshTokenRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('getByToken should return token with session', async () => {
    mockTx.refreshToken.findUnique.mockResolvedValue(mockToken);
    const result = await repository.getByToken('token-string');
    expect(result).toEqual(mockToken);
    expect(mockTx.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { token: 'token-string' },
      include: { session: true },
    });
  });

  it('create should save new token', async () => {
    mockTx.refreshToken.create.mockResolvedValue(mockToken);
    const data = {
      token: 'new-token',
      session: { connect: { id: 's1' } },
    };
    const result = await repository.create(data);
    expect(result).toEqual(mockToken);
    expect(mockTx.refreshToken.create).toHaveBeenCalledWith({ data });
  });

  it('update should modify token data', async () => {
    mockTx.refreshToken.update.mockResolvedValue(mockToken);
    const data = { revokedAt: new Date() };
    const result = await repository.update('token-string', data);
    expect(result).toEqual(mockToken);
    expect(mockTx.refreshToken.update).toHaveBeenCalledWith({
      where: { token: 'token-string' },
      data,
    });
  });

  it('revoke should mark token as revoked', async () => {
    mockTx.refreshToken.update.mockResolvedValue({ ...mockToken, revokedAt: new Date() });
    const result = await repository.revoke('token-string');
    expect(result.revokedAt).toBeDefined();
    expect(mockTx.refreshToken.update).toHaveBeenCalledWith({
      where: { token: 'token-string' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revokeAllBySessionId should revoke multiple tokens', async () => {
    mockTx.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    await repository.revokeAllBySessionId('session-id');
    expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-id', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('deleteByToken should remove record', async () => {
    mockTx.refreshToken.delete.mockResolvedValue(mockToken);
    await repository.deleteByToken('token-string');
    expect(mockTx.refreshToken.delete).toHaveBeenCalledWith({
      where: { token: 'token-string' },
    });
  });
});
