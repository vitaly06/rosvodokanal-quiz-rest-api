import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvrSewerPlumberService } from './avr-sewer-plumber.service';
import { UpdateAvrSewerPlumberTaskDto } from './dto/avr-sewer-plumber.dto';

@ApiTags('Лучший слесарь АВР по канализационным сетям - 2025')
@Controller('avr-sewer-plumber')
export class AvrSewerPlumberController {
  constructor(private readonly service: AvrSewerPlumberService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateAvrSewerPlumberTaskDto) {
    return this.service.updateTask(dto);
  }

  @Get('result-table')
  async getResultTable() {
    return await this.service.getResultTable();
  }
}
