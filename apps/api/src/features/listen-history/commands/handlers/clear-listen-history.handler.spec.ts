import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@/shared/services/prisma.service';
import { ClearListenHistoryCommand } from '../impl/clear-listen-history.command';
import { ClearListenHistoryHandler } from './clear-listen-history.handler';

describe('ClearListenHistoryHandler', () => {
  let prisma: DeepMocked<PrismaService>;
  let handler: ClearListenHistoryHandler;
  let mockListenHistoryClient: {
    updateMany: ReturnType<typeof vi.fn>;
  };

  const userId = 'user-123';

  beforeEach(() => {
    prisma = createMock<PrismaService>();
    mockListenHistoryClient = {
      updateMany: vi.fn(),
    };

    Object.defineProperty(prisma, 'client', {
      value: {
        listenHistory: mockListenHistoryClient,
      },
      writable: true,
      configurable: true,
    });

    handler = new ClearListenHistoryHandler(prisma);
  });

  it('should successfully soft-delete all listen history entries for the given user', async () => {
    mockListenHistoryClient.updateMany.mockResolvedValue({ count: 5 });

    const result = await handler.execute(new ClearListenHistoryCommand(userId));

    expect(mockListenHistoryClient.updateMany).toHaveBeenCalledWith({
      where: { userId, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toEqual({ success: true });
  });
});
