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
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Error generating OTP for email id ${mockEmailAddress.id} and type emailVerification: Redis error`)),
        undefined,
        'OtpCodeService',
      );
    });

    it('should throw InternalServerErrorException if redis fails with a non-Error object', async () => {
      hashingService.hash.mockResolvedValue('hashed-otp');
      redis.set.mockRejectedValue('String error');

      await expect(service.generateOTPCode(mockEmailAddress, 'emailVerification'))
        .rejects.toThrow(InternalServerErrorException);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Error generating OTP for email id ${mockEmailAddress.id} and type emailVerification: Unknown error`)),
        undefined,
        'OtpCodeService',
      );
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
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('return redis.call("DEL", KEYS[1])'),
        1,
        `otp:emailVerification:${mockEmailAddress.email}:claim`,
        expect.any(String),
      );
    });

    it('should return false if lock cannot be acquired', async () => {
      redis.set.mockResolvedValue(null); // Lock exists

      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      expect(result).toBe(false);
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.eval).toHaveBeenCalled();
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
      redis.eval.mockResolvedValue(1); // Ensure lock release doesn't throw

      await expect(service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification'))
        .rejects.toThrow(InternalServerErrorException);

      expect(redis.eval).toHaveBeenCalled(); // finally, block
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Error verifying OTP for email id ${mockEmailAddress.id} and type emailVerification: Redis crash`)),
        undefined,
        'OtpCodeService',
      );
    });

    it('should throw InternalServerErrorException if verify fails with a non-Error object', async () => {
      redis.set.mockResolvedValue('OK');
      redis.get.mockRejectedValue('String error');
      redis.eval.mockResolvedValue(1);

      await expect(service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification'))
        .rejects.toThrow(InternalServerErrorException);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Error verifying OTP for email id ${mockEmailAddress.id} and type emailVerification: Unknown error`)),
        undefined,
        'OtpCodeService',
      );
    });

    it('should log a warning if releaseClaimLock fails with an Error object', async () => {
      // Arrange
      const releaseError = new Error('Redis eval error during lock release');
      redis.set.mockResolvedValue('OK'); // Lock acquired
      redis.get.mockResolvedValue(hashedOtp);
      hashingService.compare.mockResolvedValue(true);
      redis.eval.mockRejectedValue(releaseError); // Simulate error in releaseClaimLock

      // Act
      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      // Assert
      expect(result).toBe(true); // Verification still succeeds, but lock release fails
      expect(redis.eval).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Failed to release OTP claim lock for key otp:emailVerification:${mockEmailAddress.email}:claim: ${releaseError.message}`)),
        'OtpCodeService',
      );
    });

    it('should log a warning if releaseClaimLock fails with a non-Error object', async () => {
      // Arrange
      const releaseError = 'Non-Error object thrown';
      redis.set.mockResolvedValue('OK'); // Lock acquired
      redis.get.mockResolvedValue(hashedOtp);
      hashingService.compare.mockResolvedValue(true);
      redis.eval.mockRejectedValue(releaseError); // Simulate non-Error in releaseClaimLock

      // Act
      const result = await service.verifyOTPCode(mockEmailAddress, otp, 'emailVerification');

      // Assert
      expect(result).toBe(true); // Verification still succeeds, but lock release fails
      expect(redis.eval).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`Failed to release OTP claim lock for key otp:emailVerification:${mockEmailAddress.email}:claim: Unknown error`)),
        'OtpCodeService',
      );
    });
  });
});
