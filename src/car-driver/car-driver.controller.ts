import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CarDriverService } from './car-driver.service';
import { UpdateCarDriverTaskDto } from './dto/car-driver.dto';

@ApiTags('Лучший водитель автомобиля (легкового) - 2025')
@Controller('car-driver')
export class CarDriverController {
  constructor(private readonly service: CarDriverService) {}

  @Get('table')
  async getTable() {
    return this.service.getTable();
  }

  @Patch('update')
  @HttpCode(200)
  async updateTask(@Body() dto: UpdateCarDriverTaskDto) {
    return this.service.updateTask(dto);
  }

  // @Get('calculate')
  // async calculateResults() {
  //   return this.service.calculateResults();
  // }
}
