import { Module } from '@nestjs/common';
import { BranchLineNumberService } from './branch-line-number.service';
import { BranchLineNumberController } from './branch-line-number.controller';

@Module({
  controllers: [BranchLineNumberController],
  providers: [BranchLineNumberService],
})
export class BranchLineNumberModule {}
