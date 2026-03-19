import { Injectable } from '@nestjs/common';
import { HashingService } from '@/shared/services/hashing.service';
import { InjectSharedRedisClient } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class OtpCodeService {
  constructor(
    private readonly hashingService: HashingService,
    @InjectSharedRedisClient() private readonly redis: Redis,
  ) {}

  async GenerateOTPCode(userId: string, email: string): Promise<string> {}
}