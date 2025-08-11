import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvrSewerService } from './avr-sewer.service';
import { UpdateAvrSewerTaskDto } from './dto/avr-sewer-task.dto';

@ApiTags('Лучшая бригада  АВР по канализационным сетям - 2025')
@Controller('avr-sewer')
export class AvrSewerController {
  constructor(private readonly service: AvrSewerService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateAvrSewerTaskDto) {
    return this.service.updateTask(dto);
  }
}
