import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisProvider } from './redis.provider';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        on: vi.fn(),
        quit: vi.fn().mockResolvedValue('OK'),
      };
    }),
  };
});

function createConfigServiceMock(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: undefined,
    ...overrides,
  };

  return {
    get: vi.fn((key: string) => values[key]),
  };
}

describe('RedisProvider', () => {
  let provider: RedisProvider;
  let redisMock: ReturnType<typeof vi.fn>;

  async function createProvider(configOverrides: Record<string, unknown> = {}) {
    vi.mocked(Redis).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisProvider,
        {
          provide: ConfigService,
          useValue: createConfigServiceMock(configOverrides),
        },
      ],
    }).compile();

    provider = module.get<RedisProvider>(RedisProvider);
    redisMock = vi.mocked(Redis).mock.results.at(-1)?.value;
  }

  beforeEach(async () => {
    await createProvider();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should initialize redis client without password when REDIS_PASSWORD is unset', () => {
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'playr:playback:',
    });
  });

  it('should initialize redis client with password when REDIS_PASSWORD is set', async () => {
    await createProvider({ REDIS_PASSWORD: 'redis-secret' });

    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      password: 'redis-secret',
      keyPrefix: 'playr:playback:',
    });
  });

  it('should register an error event listener', () => {
    expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should log an error when redis client emits an error', () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const errorCallback = redisMock.on.mock.calls.find((call: unknown[]) => call[0] === 'error')[1];

    const testError = new Error('Test redis error');
    errorCallback(testError);

    expect(loggerSpy).toHaveBeenCalledWith(`Redis error: ${testError.message}`);
    loggerSpy.mockRestore();
  });

  it('should quit redis client on module destroy', async () => {
    await provider.onModuleDestroy();
    expect(redisMock.quit).toHaveBeenCalled();
  });
});
