import { Controller, Get } from '@nestjs/common';
import { FullNameService } from './full-name.service';

@Controller('full-name')
export class FullNameController {
  constructor(private readonly fullNameService: FullNameService) {}

  @Get('find-all')
  async findAll() {
    return await this.fullNameService.findAll();
  }
}
