import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { HashingService } from '@/shared/services/hashing.service';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class OtpCodeService {
  private readonly logger = new Logger(OtpCodeService.name);

  constructor(
    private readonly hashingService: HashingService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async generateOTPCode(
    email: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<string> {
    try {
      const otp = crypto.randomInt(10000000, 99999999).toString();
      const hashedOtp = await this.hashingService.hash(otp);
      const expirationTime = 15; // 15 minutes
      const key = `otp:${otpType}:${email}`;

      this.logger.log(`Generated OTP for ${email} and type ${otpType}`);

      await this.redis.set(key, hashedOtp, 'EX', expirationTime * 60);

      return otp;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Error generating OTP for ${email} and type ${otpType}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to generate OTP code');
    }
  }

  async verifyOTPCode(
    email: string,
    otp: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<boolean> {
    const key = `otp:${otpType}:${email}`;

    try {
      const storedOtp = await this.redis.get(key);

      if (!storedOtp) {
        this.logger.warn(`No OTP found for ${email} and type ${otpType}`);
        return false;
      }

      const isMatch = await this.hashingService.compare(otp, storedOtp);

      if (isMatch) {
        this.logger.log(`OTP for ${email} and type ${otpType} verified successfully`);
        await this.redis.del(key);
      } else {
        this.logger.warn(`OTP for ${email} and type ${otpType} verification failed`);
      }

      return isMatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Error verifying OTP for ${email} and type ${otpType}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to verify OTP code');
    }
  }

  async checkIfOTPCodeExist(
    email: string,
    otpType: 'emailVerification' | 'passwordReset',
  ): Promise<boolean> {
    const key = `otp:${otpType}:${email}`;

    try{
      const storedOtp = await this.redis.get(key);

      return !!storedOtp;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Error checking OTP existence for ${email} and type ${otpType}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to check OTP code existence');
    }
  }
}