import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetListenHistoryQuery } from '../impl/get-listen-history.query';
import { GetListenHistoryHandler } from './get-listen-history.handler';
import { ListenHistoryService } from '../../services/listen-history.service';

describe('GetListenHistoryHandler', () => {
  let handler: GetListenHistoryHandler;
  let listenHistoryService: DeepMocked<ListenHistoryService>;

  beforeEach(async () => {
    listenHistoryService = createMock<ListenHistoryService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetListenHistoryHandler,
        { provide: ListenHistoryService, useValue: listenHistoryService },
      ],
    }).compile();

    handler = module.get<GetListenHistoryHandler>(GetListenHistoryHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call getListenHistory on ListenHistoryService', async () => {
    const userId = 'user-123';
    const query = new GetListenHistoryQuery(userId, 1, 20);
    const mockResponse = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    };

    listenHistoryService.getListenHistory.mockResolvedValue(mockResponse);

    const result = await handler.execute(query);

    expect(listenHistoryService.getListenHistory).toHaveBeenCalledWith(userId, 1, 20);
    expect(result).toBe(mockResponse);
  });
});
