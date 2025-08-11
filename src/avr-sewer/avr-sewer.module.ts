import { Module } from '@nestjs/common';
import { AvrSewerService } from './avr-sewer.service';
import { AvrSewerController } from './avr-sewer.controller';

@Module({
  controllers: [AvrSewerController],
  providers: [AvrSewerService],
})
export class AvrSewerModule {}
