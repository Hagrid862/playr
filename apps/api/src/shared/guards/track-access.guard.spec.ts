import { CHECK_TRACK_ACCESS_KEY } from '@/common/decorators/check-track-access.decorator';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Visibility } from '@repo/db';
import { trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackRepository } from '../repositories/track.repository';
import { TrackAccessGuard } from './track-access.guard';

describe('TrackAccessGuard', () => {
  let guard: TrackAccessGuard;
  let reflector: DeepMocked<Reflector>;
  let trackRepository: DeepMocked<TrackRepository>;
  let mockExecutionContext: DeepMocked<ExecutionContext>;

  beforeEach(async () => {
    const httpHost = createMock<ReturnType<ExecutionContext['switchToHttp']>>();

    reflector = createMock<Reflector>();
    trackRepository = createMock<TrackRepository>();
    mockExecutionContext = createMock<ExecutionContext>({ switchToHttp: () => httpHost });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackAccessGuard,
        { provide: Reflector, useValue: reflector },
        { provide: TrackRepository, useValue: trackRepository },
      ],
    }).compile();

    guard = module.get<TrackAccessGuard>(TrackAccessGuard);

    mockExecutionContext.getHandler.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no metadata is found', async () => {
    vi.mocked(reflector.get).mockReturnValue(undefined);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith(
      CHECK_TRACK_ACCESS_KEY,
      mockExecutionContext.getHandler(),
    );
  });

  it('should return true if trackId is not present in request params', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: {},
      user: { user: { id: 'userId' } },
    });

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should return true if access check passes', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { trackId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(trackRepository.checkAccess).mockResolvedValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(trackRepository.checkAccess).toHaveBeenCalledWith({ id: '123' }, 'userId');
  });

  it('should throw NotFoundException if access denied and track does not exist', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { trackId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(trackRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(trackRepository.findOne).mockResolvedValue(null);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(NotFoundException);
    expect(trackRepository.findOne).toHaveBeenCalledWith({ id: '123' });
  });

  it('should throw ForbiddenException if access denied and track exists', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { trackId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(trackRepository.checkAccess).mockResolvedValue(false);

    const mockTrack = trackBuilder({
      id: '123',
      title: 'Test Track',
      trackNumber: 1,
      diskNumber: 1,
      duration: 300,
      listenedCount: 0,
      explicit: false,
      lyrics: null,
      visibility: Visibility.public,
      albumId: 'album-123',
      deletedAt: null,
    });

    vi.mocked(trackRepository.findOne).mockResolvedValue({ ...mockTrack, access: [] });

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
  });
});
