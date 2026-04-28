import { Test, TestingModule } from '@nestjs/testing';
import { OtpCodeService } from './otp-code.service';
import { HashingService } from '@/shared/services/hashing.service';
import { Redis } from 'ioredis';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailAddressBuilder } from '@repo/testing/builders';
import { InternalServerErrorException, Logger } from '@nestjs/common';

describe('OtpCodeService', () => {
  let service: OtpCodeService;
  let hashingService: DeepMocked<HashingService>;
  let redis: DeepMocked<Redis>;
  let logger: DeepMocked<Logger>;

  const mockEmailAddress = emailAddressBuilder({
    email: 'test@example.com',
  });

  beforeEach(async () => {
    hashingService = createMock<HashingService>();
    redis = createMock<Redis>();
    logger = createMock<Logger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpCodeService,
        { provide: HashingService, useValue: hashingService },
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    })
      .setLogger(logger)
      .compile();

    service = module.get<OtpCodeService>(OtpCodeService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOTPCode', () => {
    it('should generate, hash and store an OTP code', async () => {
      hashingService.hash.mockResolvedValue('hashed-otp');
      redis.set.mockResolvedValue('OK');

      const otp = await service.generateOTPCode(mockEmailAddress, 'emailVerification');

      expect(otp).toHaveLength(8);
      expect(hashingService.hash).toHaveBeenCalledWith(otp);
      expect(redis.set).toHaveBeenCalledWith(
        `otp:emailVerification:${mockEmailAddress.email}`,
        'hashed-otp',
        'EX',
        expect.any(Number),
      );
    });

    it('should throw InternalServerErrorException if redis fails', async () => {
      hashingService.hash.mockResolvedValue('hashed-otp');
      redis.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.generateOTPCode(mockEmailAddress, 'emailVerification'))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('verifyOTPCode', () => {
    const otp = '12345678';
    const hashedOtp = 'hashed-otp';

    it('should return true and delete key if OTP matches', async () => {
      redis.set.mockResolvedValue('OK'); // Lock acquired
      redis.get.mockResolvedValue(hashedOtp);
      hashingService.compare.mockResolvedValue(true);
      redis.eval.mockResolvedValue(1); // Lock released

      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalledWith(`otp:emailVerification:${mockEmailAddress.email}`);
      expect(redis.del).toHaveBeenCalledWith(`otp:emailVerification:${mockEmailAddress.email}`);
    });

    it('should return false if lock cannot be acquired', async () => {
      redis.set.mockResolvedValue(null); // Lock exists

      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      expect(result).toBe(false);
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return false if no OTP is stored', async () => {
      redis.set.mockResolvedValue('OK');
      redis.get.mockResolvedValue(null);

      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      expect(result).toBe(false);
    });

    it('should return false if OTP does not match', async () => {
      redis.set.mockResolvedValue('OK');
      redis.get.mockResolvedValue(hashedOtp);
      hashingService.compare.mockResolvedValue(false);

      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      expect(result).toBe(false);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException and release lock on error', async () => {
      redis.set.mockResolvedValue('OK');
      redis.get.mockRejectedValue(new Error('Redis crash'));

      await expect(service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification'))
        .rejects.toThrow(InternalServerErrorException);
      
      expect(redis.eval).toHaveBeenCalled(); // finally block
    });
  });
});
