import { Module } from '@nestjs/common';
import { PrivateProfileController } from './private-profile.controller';

@Module({
  controllers: [PrivateProfileController],
})
export class PrivateProfileModule { }
