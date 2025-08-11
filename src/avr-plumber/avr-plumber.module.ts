import { Module } from '@nestjs/common';
import { AvrPlumberService } from './avr-plumber.service';
import { AvrPlumberController } from './avr-plumber.controller';

@Module({
  controllers: [AvrPlumberController],
  providers: [AvrPlumberService],
})
export class AvrPlumberModule {}
