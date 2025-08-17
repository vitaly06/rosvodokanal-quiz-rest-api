import { Module } from '@nestjs/common';
import { UserLineNumberService } from './user-line-number.service';
import { UserLineNumberController } from './user-line-number.controller';

@Module({
  controllers: [UserLineNumberController],
  providers: [UserLineNumberService],
})
export class UserLineNumberModule {}
