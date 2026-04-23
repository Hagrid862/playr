import { CHECK_ALBUM_ACCESS_KEY } from '@/common/decorators/check-album-access.decorator';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumRepository } from '../repositories/album.repository';
import { AlbumAccessGuard } from './album-access.guard';

describe('AlbumAccessGuard', () => {
  let guard: AlbumAccessGuard;
  let reflector: DeepMocked<Reflector>;
  let albumRepository: DeepMocked<AlbumRepository>;
  let mockExecutionContext: DeepMocked<ExecutionContext>;

  beforeEach(async () => {
    const httpHost = createMock<ReturnType<ExecutionContext['switchToHttp']>>();

    reflector = createMock<Reflector>();
    albumRepository = createMock<AlbumRepository>();
    mockExecutionContext = createMock<ExecutionContext>({ switchToHttp: () => httpHost });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumAccessGuard,
        { provide: Reflector, useValue: reflector },
        { provide: AlbumRepository, useValue: albumRepository },
      ],
    }).compile();

    guard = module.get<AlbumAccessGuard>(AlbumAccessGuard);

    vi.clearAllMocks();
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
      CHECK_ALBUM_ACCESS_KEY,
      mockExecutionContext.getHandler(),
    );
  });

  it('should return true if albumId is not present in request params', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: {},
      user: { user: { id: 'userId' } },
    });

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should return true if access check passes', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { albumId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(albumRepository.checkAccess).mockResolvedValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(albumRepository.checkAccess).toHaveBeenCalledWith({ id: '123' }, 'userId');
  });

  it('should throw NotFoundException if access denied and album does not exist', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { albumId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(albumRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(albumRepository.exists).mockResolvedValue(false);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(NotFoundException);
    expect(albumRepository.exists).toHaveBeenCalledWith({ id: '123' });
  });

  it('should throw ForbiddenException if access denied and album exists', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { albumId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(albumRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(albumRepository.exists).mockResolvedValue(true);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
  });
});
