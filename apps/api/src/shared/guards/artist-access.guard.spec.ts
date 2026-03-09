import { CHECK_ARTIST_ACCESS_KEY } from '@/common/decorators/check-artist-access.decorator';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtistRepository } from '../repositories/artist.repository';
import { ArtistAccessGuard } from './artist-access.guard';

describe('ArtistAccessGuard', () => {
  let guard: ArtistAccessGuard;
  let reflector: Reflector;
  let artistRepository: ArtistRepository;

  const mockReflector = {
    get: vi.fn(),
  };

  const mockArtistRepository = {
    checkAccess: vi.fn(),
    exists: vi.fn(),
  };

  const mockExecutionContext = {
    getHandler: vi.fn(),
    switchToHttp: vi.fn().mockReturnThis(),
    getRequest: vi.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistAccessGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: ArtistRepository,
          useValue: mockArtistRepository,
        },
      ],
    }).compile();

    guard = module.get<ArtistAccessGuard>(ArtistAccessGuard);
    reflector = module.get<Reflector>(Reflector);
    artistRepository = module.get<ArtistRepository>(ArtistRepository);

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
      CHECK_ARTIST_ACCESS_KEY,
      mockExecutionContext.getHandler(),
    );
  });

  it('should return true if artistId is not present in request params', async () => {
    vi.mocked(reflector.get).mockReturnValue('artistId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: {},
      user: { user: { id: 'userId' } },
    });

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should return true if access check passes', async () => {
    vi.mocked(reflector.get).mockReturnValue('artistId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { artistId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(artistRepository.checkAccess).mockResolvedValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(artistRepository.checkAccess).toHaveBeenCalledWith('123', 'userId');
  });

  it('should throw NotFoundException if access denied and artist does not exist', async () => {
    vi.mocked(reflector.get).mockReturnValue('artistId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { artistId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(artistRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(artistRepository.exists).mockResolvedValue(false);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(NotFoundException);
    expect(artistRepository.exists).toHaveBeenCalledWith('123');
  });

  it('should throw ForbiddenException if access denied and artist exists', async () => {
    vi.mocked(reflector.get).mockReturnValue('artistId');
    vi.mocked(mockExecutionContext.switchToHttp().getRequest).mockReturnValue({
      params: { artistId: '123' },
      user: { user: { id: 'userId' } },
    });
    vi.mocked(artistRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(artistRepository.exists).mockResolvedValue(true);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
  });
});
