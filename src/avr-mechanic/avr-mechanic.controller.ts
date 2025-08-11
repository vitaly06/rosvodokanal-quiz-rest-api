import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { AvrMechanicService } from './avr-mechanic.service';
import { ApiTags } from '@nestjs/swagger';
import { UpdateAvrMechanicTaskDto } from './dto/avr-mechanic.dto';

@ApiTags('Лучшая бригада  АВР по водопроводным сетям - 2025')
@Controller('avr-mechanic')
export class AvrMechanicController {
  constructor(private readonly service: AvrMechanicService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('upsert')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateAvrMechanicTaskDto) {
    return this.service.updateTask(dto);
  }
}
