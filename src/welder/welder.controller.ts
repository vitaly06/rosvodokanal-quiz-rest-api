import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WelderService } from './welder.service';
import { UpdateWelderTaskDto } from './dto/welder-task.dto';

@ApiTags('Таблица сварщиков')
@Controller('welder')
export class WelderController {
  constructor(private readonly service: WelderService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateWelderTaskDto) {
    return this.service.updateTask(dto);
  }

  @Get('result-table')
  async getResultTable() {
    return await this.service.getResultTable();
  }
}
