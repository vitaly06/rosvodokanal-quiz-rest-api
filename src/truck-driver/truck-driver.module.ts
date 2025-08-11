import { Module } from '@nestjs/common';
import { TruckDriverService } from './truck-driver.service';
import { TruckDriverController } from './truck-driver.controller';

@Module({
  controllers: [TruckDriverController],
  providers: [TruckDriverService],
})
export class TruckDriverModule {}
