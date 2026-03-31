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

describe('RedisProvider', () => {
  let provider: RedisProvider;
  let configService: ConfigService;
  let redisMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisProvider,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn((key: string) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              throw new Error(`Unexpected key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<RedisProvider>(RedisProvider);
    configService = module.get<ConfigService>(ConfigService);
    redisMock = (Redis as any).mock.results[0].value;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should initialize redis client with correct config', () => {
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'playr:playback:',
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('REDIS_HOST');
    expect(configService.getOrThrow).toHaveBeenCalledWith('REDIS_PORT');
  });

  it('should register an error event listener', () => {
    expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should log an error when redis client emits an error', () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const errorCallback = redisMock.on.mock.calls.find((call: any) => call[0] === 'error')[1];

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
