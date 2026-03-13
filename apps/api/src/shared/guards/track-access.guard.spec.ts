import { CHECK_TRACK_ACCESS_KEY } from '@/common/decorators/check-track-access.decorator';
import { createMock } from '@golevelup/ts-vitest';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildTrack } from '@repo/testing';
import { TrackRepository } from '../repositories/track.repository';
import { TrackAccessGuard } from './track-access.guard';

describe('TrackAccessGuard', () => {
  let guard: TrackAccessGuard;
  let reflector: Reflector;
  let trackRepository: TrackRepository;

  const mockReflector = {
    get: vi.fn(),
  };

  const mockTrackRepository = {
    checkAccess: vi.fn(),
    findOne: vi.fn(),
  };

  let mockExecutionContext: ReturnType<typeof createMock<ExecutionContext>>;

  beforeEach(async () => {
    mockExecutionContext = createMock<ExecutionContext>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackAccessGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: TrackRepository,
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    guard = module.get<TrackAccessGuard>(TrackAccessGuard);
    reflector = module.get<Reflector>(Reflector);
    trackRepository = module.get<TrackRepository>(TrackRepository);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no metadata is found', async () => {
    vi.mocked(reflector.get).mockReturnValue(undefined);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith(CHECK_TRACK_ACCESS_KEY, expect.any(Function));
  });

  it('should return true if trackId is not present in request params', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
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
    vi.mocked(reflector.get).mockReturnValue('trackId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: { trackId: '123' },
          user: { user: { id: 'userId' } },
        }),
      }),
    );
    vi.mocked(trackRepository.checkAccess).mockResolvedValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(trackRepository.checkAccess).toHaveBeenCalledWith('123', 'userId');
  });

  it('should throw NotFoundException if access denied and track does not exist', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: { trackId: '123' },
          user: { user: { id: 'userId' } },
        }),
      }),
    );
    vi.mocked(trackRepository.checkAccess).mockResolvedValue(false);
    vi.mocked(trackRepository.findOne).mockResolvedValue(null);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(NotFoundException);
    expect(trackRepository.findOne).toHaveBeenCalledWith({ id: '123' });
  });

  it('should throw ForbiddenException if access denied and track exists', async () => {
    vi.mocked(reflector.get).mockReturnValue('trackId');
    mockExecutionContext.switchToHttp.mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue({
          params: { trackId: '123' },
          user: { user: { id: 'userId' } },
        }),
      }),
    );
    vi.mocked(trackRepository.checkAccess).mockResolvedValue(false);

    const mockTrack = buildTrack({
      id: '123',
      title: 'Test Track',
    });

    vi.mocked(trackRepository.findOne).mockResolvedValue(mockTrack);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
  });
});
