import { Module } from '@nestjs/common';
import { CarDriverService } from './car-driver.service';
import { CarDriverController } from './car-driver.controller';

@Module({
  controllers: [CarDriverController],
  providers: [CarDriverService],
})
export class CarDriverModule {}
