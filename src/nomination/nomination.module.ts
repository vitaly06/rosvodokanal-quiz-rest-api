import { Module } from '@nestjs/common';
import { NominationService } from './nomination.service';
import { NominationController } from './nomination.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  controllers: [NominationController],
  providers: [NominationService],
})
export class NominationModule {}
