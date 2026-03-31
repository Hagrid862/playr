import { QueryBus } from '@nestjs/cqrs';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { GetPlaybackStateQuery } from '../impl/get-playback-state.query';
import { GetQueueStateQuery } from '../impl/get-queue-state.query';
import { GetQueueStateHandler } from './get-queue-state.handler';

describe('GetQueueStateHandler', () => {
  const userId = 'user-1';

  it('returns queue state from playback state', async () => {
    const queryBus = createMock<QueryBus>();
    const handler = new GetQueueStateHandler(queryBus);
    const query = new GetQueueStateQuery(userId);

    const mockState = {
      queue: [{ track: { id: 't1' } as any, position: 0, queueId: 'q1' }],
      version: 5,
    };

    queryBus.execute.mockResolvedValue(mockState);

    const result = await handler.execute(query);
    expect(result?.items).toHaveLength(1);
    expect(result?.version).toBe(5);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetPlaybackStateQuery));
  });

  it('returns null when playback state is null', async () => {
    const queryBus = createMock<QueryBus>();
    const handler = new GetQueueStateHandler(queryBus);
    const query = new GetQueueStateQuery(userId);

    queryBus.execute.mockResolvedValue(null);

    const result = await handler.execute(query);
    expect(result).toBeNull();
  });
});
