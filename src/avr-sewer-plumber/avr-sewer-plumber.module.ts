import { Module } from '@nestjs/common';
import { AvrSewerPlumberService } from './avr-sewer-plumber.service';
import { AvrSewerPlumberController } from './avr-sewer-plumber.controller';

@Module({
  controllers: [AvrSewerPlumberController],
  providers: [AvrSewerPlumberService],
})
export class AvrSewerPlumberModule {}
