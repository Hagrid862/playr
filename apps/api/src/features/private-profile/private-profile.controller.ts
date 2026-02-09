import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Private Profile')
@Controller('private-profile')
export class PrivateProfileController {
  constructor() { }

  @Post()
  createPrivateProfile() {
    return 'This action adds a new private profile';
  }
}
