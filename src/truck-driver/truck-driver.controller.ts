import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TruckDriverService } from './truck-driver.service';
import { UpdateTruckDriverTaskDto } from './dto/truck-driver.dto';

@ApiTags('Лучший водитель автомобиля (грузового) - 2025')
@Controller('truck-driver')
export class TruckDriverController {
  constructor(private readonly service: TruckDriverService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateTruckDriverTaskDto) {
    return this.service.updateTask(dto);
  }

  // @Get('calculate')
  // async calculateResults() {
  //   return this.service.calculateResults();
  // }
}
