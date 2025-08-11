import { Module } from '@nestjs/common';
import { WelderService } from './welder.service';
import { WelderController } from './welder.controller';

@Module({
  controllers: [WelderController],
  providers: [WelderService],
})
export class WelderModule {}
