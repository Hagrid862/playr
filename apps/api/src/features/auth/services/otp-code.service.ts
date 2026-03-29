import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { HashingService } from '@/shared/services/hashing.service';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import type { EmailAddress } from "@repo/db";

@Injectable()
export class OtpCodeService {
  private readonly logger = new Logger(OtpCodeService.name);

  private async releaseClaimLock(claimKey: string, claimToken: string): Promise<void> {
    try {
      await this.redis.eval(
        'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end',
        1,
        claimKey,
        claimToken,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to release OTP claim lock for key ${claimKey}: ${errorMessage}`);
    }
  }

  constructor(
    private readonly hashingService: HashingService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async generateOTPCode(
    emailObj: EmailAddress,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<string> {
    try {
      const otp = crypto.randomInt(10000000, 99999999).toString();
      const hashedOtp = await this.hashingService.hash(otp);
      const expirationTime = 15; // 15 minutes
      const key = `otp:${otpType}:${emailObj.email}`;

      this.logger.log(`Generated OTP for email id ${emailObj.id} and type ${otpType}`);

      await this.redis.set(key, hashedOtp, 'EX', expirationTime * 60);

      return otp;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Error generating OTP for email id ${emailObj.id} and type ${otpType}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to generate OTP code');
    }
  }

  async verifyOTPCode(
    emailObj: EmailAddress,
    otp: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<boolean> {
    const key = `otp:${otpType}:${emailObj.email}`;
    const claimKey = `${key}:claim`;
    const claimToken = crypto.randomUUID();
    const claimTtlMs = 5000;

    try {
      const claimResult = await this.redis.set(claimKey, claimToken, 'PX', claimTtlMs, 'NX');

      if (claimResult !== 'OK') {
        this.logger.warn(
          `OTP verification already in progress for email id ${emailObj.id} and type ${otpType}`,
        );
        return false;
      }

      const storedOtp = await this.redis.get(key);

      if (!storedOtp) {
        this.logger.warn(`No OTP found for email id ${emailObj.id} and type ${otpType}`);
        return false;
      }

      const isMatch = await this.hashingService.compare(otp, storedOtp);

      if (isMatch) {
        this.logger.log(`OTP for email id ${emailObj.id} and type ${otpType} verified successfully`);
        await this.redis.del(key);
      } else {
        this.logger.warn(`OTP for email id ${emailObj.id} and type ${otpType} verification failed`);
      }

      return isMatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Error verifying OTP for email id ${emailObj.id} and type ${otpType}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to verify OTP code');
    } finally {
      await this.releaseClaimLock(claimKey, claimToken);
    }
  }
}