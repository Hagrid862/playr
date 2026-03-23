import { Injectable, Inject } from '@nestjs/common';
import { HashingService } from '@/shared/services/hashing.service';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class OtpCodeService {
  constructor(
    private readonly hashingService: HashingService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async GenerateOTPCode(
    email: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<string> {
    const otp = crypto.randomInt(10000000, 99999999).toString();
    const hashedOtp = await this.hashingService.hash(otp);
    const expirationTime = 15; // 15 minutes
    const key = `otp:${otpType}:${email}`;

    await this.redis.set(key, hashedOtp, 'EX', expirationTime * 60);

    return otp;
  }

  async VerifyOTPCode(
    email: string,
    otp: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<boolean> {
    const key = `otp:${otpType}:${email}`;

    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      return false;
    }

    const isMatch = await this.hashingService.compare(otp, storedOtp);

    if (isMatch) {
      await this.redis.del(key);
    }

    return isMatch;
  }

  async CheckIfOTPCodeExist(
    email: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<boolean> {
    const key = `otp:${otpType}:${email}`;

    const storedOtp = await this.redis.get(key);

    return !!storedOtp;
  }
}