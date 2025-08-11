import { Module } from '@nestjs/common';
import { AvrMechanicService } from './avr-mechanic.service';
import { AvrMechanicController } from './avr-mechanic.controller';

@Module({
  controllers: [AvrMechanicController],
  providers: [AvrMechanicService],
})
export class AvrMechanicModule {}
