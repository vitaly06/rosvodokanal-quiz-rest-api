import { Module } from '@nestjs/common';
import { NominationService } from './nomination.service';
import { NominationController } from './nomination.controller';

@Module({
  controllers: [NominationController],
  providers: [NominationService],
})
export class NominationModule {}
