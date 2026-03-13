import { CHECK_ALBUM_ACCESS_KEY } from '@/common/decorators/check-album-access.decorator';
import { createMock } from '@golevelup/ts-vitest';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumRepository } from '../repositories/album.repository';
import { AlbumAccessGuard } from './album-access.guard';

describe('AlbumAccessGuard', () => {
  let guard: AlbumAccessGuard;
  let reflector: Reflector;
  let albumRepository: AlbumRepository;

  const mockReflector = {
    get: vi.fn(),
  };

  const mockAlbumRepository = {
    checkAccess: vi.fn(),
    exists: vi.fn(),
  };

  let mockExecutionContext: ReturnType<typeof createMock<ExecutionContext>>;

  beforeEach(async () => {
    mockExecutionContext = createMock<ExecutionContext>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumAccessGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AlbumRepository,
          useValue: mockAlbumRepository,
        },
      ],
    }).compile();

    guard = module.get<AlbumAccessGuard>(AlbumAccessGuard);
    reflector = module.get<Reflector>(Reflector);
    albumRepository = module.get<AlbumRepository>(AlbumRepository);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no metadata is found', async () => {
    vi.mocked(reflector.get).mockReturnValue(undefined);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith(CHECK_ALBUM_ACCESS_KEY, expect.any(Function));
  });

  it('should return true if albumId is not present in request params', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: {},
          user: { user: { id: 'userId' } },
        }),
      }),
    );

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should return true if access check passes', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: { albumId: '123' },
          user: { user: { id: 'userId' } },
        }),
      }),
    );
    vi.mocked(albumRepository.checkAccess).mockResolvedValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(albumRepository.checkAccess).toHaveBeenCalledWith('123', 'userId');
  });

  it('should throw NotFoundException if access denied and album does not exist', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: { albumId: '123' },
          user: { user: { id: 'userId' } },
        }),
      }),
    );
    vi.mocked(albumRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(albumRepository.exists).mockResolvedValue(false);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(NotFoundException);
    expect(albumRepository.exists).toHaveBeenCalledWith('123');
  });

  it('should throw ForbiddenException if access denied and album exists', async () => {
    vi.mocked(reflector.get).mockReturnValue('albumId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: { albumId: '123' },
          user: { user: { id: 'userId' } },
        }),
      }),
    );
    vi.mocked(albumRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(albumRepository.exists).mockResolvedValue(true);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
  });
});
