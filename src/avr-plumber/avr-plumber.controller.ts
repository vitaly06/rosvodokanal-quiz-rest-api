// avr-plumber.controller.ts
import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvrPlumberService } from './avr-plumber.service';
import { UpdateAvrPlumberTaskDto } from './dto/avr-plumber.dto';

@ApiTags('Лучший слесарь АВР по водопроводным сетям')
@Controller('avr-plumber')
export class AvrPlumberController {
  constructor(private readonly service: AvrPlumberService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateAvrPlumberTaskDto) {
    return this.service.updateTask(dto);
  }

  @Get('result-table')
  async getResultTable() {
    return await this.service.getResultTable();
  }
}
